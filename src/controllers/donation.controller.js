import asyncHandler from "../utils/asyncHandler.js";
import ApiError from '../utils/ApiError.js';
import ApiResponse from "../utils/ApiResponse.js";
import Donation from "../models/donation.model.js";
import crypto from "crypto";
import Razorpay from "razorpay";

const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new ApiError(503, "Online payments are not configured");
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

const addCampaign = asyncHandler(async (req, res) => {
    const { name, description, goal, endDate, category } = req.body;

    const newCampaign = new Donation({
        name,
        description,
        goal,
        endDate,
        category
    });

    await newCampaign.save();
    res
    .status(201)
    .json(new ApiResponse(201, newCampaign, "Donation created successfully"));
});

const editCampaign = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, goal, endDate, category } = req.body;

    const updatedCampaign = await Donation.findByIdAndUpdate(id, {
        name,
        description,
        goal,
        endDate,
        category
    }, { new: true });

    if (!updatedCampaign) {
        throw new ApiError(404, "Donation not found");
    }

    res
    .status(200)
    .json(new ApiResponse(200, updatedCampaign, "Donation updated successfully"));
});

const deleteCampaign = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deletedCampaign = await Donation.findByIdAndDelete(id);
    if (!deletedCampaign) {
        throw new ApiError(404, "Donation not found");
    }

    res
    .status(200)
    .json(new ApiResponse(200, deletedCampaign, "Donation deleted successfully"));
});

const donationAmount = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;
    const { amount } = req.body;
    
    // Validate inputs
    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }
    
    if (!amount || amount <= 0) {
        throw new ApiError(400, "Please provide a valid donation amount");
    }
    
    const campaign = await Donation.findById(id);
    if (!campaign) {
        throw new ApiError(404, "Donation campaign not found");
    }

    // Convert to numbers for proper comparison
    const numAmount = Number(amount);
    const currentRaised = Number(campaign.raisedAmount) || 0;
    const campaignGoal = Number(campaign.goal);

    if (currentRaised + numAmount > campaignGoal) {
        throw new ApiError(400, "Donation exceeds goal amount");
    }

    // Update raised amount
    campaign.raisedAmount = currentRaised + numAmount;

    // Ensure donors array exists and is clean
    if (!Array.isArray(campaign.donors)) {
        campaign.donors = [];
    }

    // Filter out any invalid donors
    campaign.donors = campaign.donors.filter(d => d.userId && d.amount);

    // Find existing donor or add new one
    const existingDonorIndex = campaign.donors.findIndex(
        d => d.userId.toString() === userId.toString()
    );
    
    if (existingDonorIndex !== -1) {
        campaign.donors[existingDonorIndex].amount = Number(campaign.donors[existingDonorIndex].amount) + numAmount;
    } else {
        campaign.donors.push({ 
            userId: userId.toString(),
            name: req.user?.name || 'Anonymous',
            email: req.user?.email || 'anonymous@example.com',
            amount: numAmount
        });

    }

    await campaign.save();
    res
    .status(200)
    .json(new ApiResponse(200, campaign, "Donation amount updated successfully"));
});

const createDonationPaymentOrder = asyncHandler(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ApiError(400, "Please provide a valid donation amount");
    }

    const campaign = await Donation.findById(id).select("name goal raisedAmount");
    if (!campaign) throw new ApiError(404, "Donation campaign not found");
    if ((Number(campaign.raisedAmount) || 0) + amount > Number(campaign.goal)) {
        throw new ApiError(400, "Donation exceeds goal amount");
    }

    const order = await getRazorpay().orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `don_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        notes: {
            campaignId: campaign._id.toString(),
            userId: user._id.toString(),
            amount: amount.toString()
        }
    });

    res.status(200).json(new ApiResponse(200, {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        campaignName: campaign.name
    }, "Donation payment order created"));
});

const verifyDonationPayment = asyncHandler(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!process.env.RAZORPAY_KEY_SECRET ||
        !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new ApiError(400, "Incomplete payment verification details");
    }

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
    const expectedBuffer = Buffer.from(expectedSignature);
    const signatureBuffer = Buffer.from(razorpay_signature);

    if (expectedBuffer.length !== signatureBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
        throw new ApiError(400, "Invalid payment signature");
    }

    const order = await getRazorpay().orders.fetch(razorpay_order_id);
    if (order.notes?.campaignId !== id ||
        order.notes?.userId !== user._id.toString() ||
        Number(order.amount) !== Math.round(Number(order.notes.amount) * 100)) {
        throw new ApiError(400, "Payment does not match this donation");
    }

    const payment = await getRazorpay().payments.fetch(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id ||
        payment.status !== "captured" ||
        Number(payment.amount) !== Number(order.amount)) {
        throw new ApiError(400, "Payment was not captured for this donation");
    }

    const existingPayment = await Donation.exists({
        _id: id,
        $or: [
            { "donors.paymentId": razorpay_payment_id },
            { "donors.paymentIds": razorpay_payment_id }
        ]
    });
    if (existingPayment) {
        throw new ApiError(409, "This payment has already been processed");
    }

    const amount = Number(order.notes.amount);
    const campaign = await Donation.findOneAndUpdate(
        {
            _id: id,
            $expr: { $lte: [{ $add: ["$raisedAmount", amount] }, "$goal"] }
        },
        { $inc: { raisedAmount: amount } },
        { new: true }
    );
    if (!campaign) throw new ApiError(400, "Donation exceeds goal amount");

    const donor = campaign.donors.find((item) => item.userId.toString() === user._id.toString());
    const paymentRecord = {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount,
        paidAt: new Date()
    };
    if (donor) {
        donor.amount += amount;
        donor.paymentIds = [...(donor.paymentIds || []), razorpay_payment_id];
        donor.payments = [...(donor.payments || []), paymentRecord];
    } else {
        campaign.donors.push({
            userId: user._id,
            amount,
            paymentId: razorpay_payment_id,
            paymentIds: [razorpay_payment_id],
            payments: [paymentRecord],
            donatedAt: paymentRecord.paidAt
        });
    }
    await campaign.save();

    res.status(200).json(new ApiResponse(200, campaign, "Donation completed successfully"));
});

const getCampaigns = asyncHandler(async (req, res) => {
    const campaigns = await Donation.find();
    const currentUserId = req.user?._id?.toString();
    const safeCampaigns = campaigns.map((campaign) => {
        const data = campaign.toObject();
        data.donors = (data.donors || []).map((donor) => {
            const donorId = donor.userId?.toString();
            if (currentUserId && donorId === currentUserId) {
                return donor;
            }

            const { paymentId, paymentIds, payments, ...publicDonor } = donor;
            return publicDonor;
        });
        return data;
    });

    res
    .status(200)
    .json(new ApiResponse(200, safeCampaigns, "Donations retrieved successfully"));
});

const getCampaignDonors = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const campaign = await Donation.findById(id).populate('donors.userId', 'name email');
     
    if (!campaign) {
        throw new ApiError(404, "Donation campaign not found");
    }

    // Transform the donors array to flatten the structure
    const formattedDonors = campaign.donors.map(donor => ({
        _id: donor._id,
        userId: donor.userId._id,
        name: donor.userId.name,
        email: donor.userId.email,
        amount: donor.amount,
        donatedAt: donor.donatedAt
    }));

    res
    .status(200)
    .json(new ApiResponse(200, formattedDonors, "Donors retrieved successfully"));
});

const getRecentDonors = asyncHandler(async (req, res) => {
    // Get all campaigns with donors
    const campaigns = await Donation.find().populate('donors.userId', 'name email graduationYear');
    
    // Collect all donors from all campaigns
    const allDonors = [];
    campaigns.forEach(campaign => {
        if (campaign.donors && campaign.donors.length > 0) {
            campaign.donors.forEach(donor => {
                allDonors.push({
                    _id: donor._id,
                    name: donor.userId?.name || 'Anonymous',
                    email: donor.userId?.email || 'donor@anonymous.com',
                    graduationYear: donor.userId?.graduationYear,
                    campaign: campaign.name,
                    amount: donor.amount,
                    donatedAt: donor.donatedAt,
                    status: 'completed' // You can make this dynamic based on payment status if needed
                });
            });
        }
    });

    // Sort by donation date (most recent first)
    allDonors.sort((a, b) => new Date(b.donatedAt) - new Date(a.donatedAt));

    res
    .status(200)
    .json(new ApiResponse(200, allDonors, "Recent donors retrieved successfully"));
});

const getDonationStats = asyncHandler(async (req, res) => {
    // Get all campaigns
    const campaigns = await Donation.find();
    
    // Calculate total raised across all campaigns
    const totalRaised = campaigns.reduce((sum, campaign) => {
        return sum + (Number(campaign.raisedAmount) || 0);
    }, 0);
    
    // Calculate total goal across all campaigns
    const totalGoal = campaigns.reduce((sum, campaign) => {
        return sum + (Number(campaign.goal) || 0);
    }, 0);
    
    // Get unique donors across all campaigns
    const uniqueDonorIds = new Set();
    let totalDonations = 0;
    
    campaigns.forEach(campaign => {
        if (campaign.donors && Array.isArray(campaign.donors)) {
            campaign.donors.forEach(donor => {
                if (donor.userId) {
                    uniqueDonorIds.add(donor.userId.toString());
                    totalDonations += 1;
                }
            });
        }
    });
    
    const activeDonors = uniqueDonorIds.size;
    
    // Calculate average donation
    const avgDonation = activeDonors > 0 ? totalRaised / activeDonors : 0;
    
    // Calculate campaign goal percentage
    const campaignGoalPercentage = totalGoal > 0 ? (totalRaised / totalGoal) * 100 : 0;
    
    const stats = {
        totalRaised,
        activeDonors,
        avgDonation,
        campaignGoalPercentage,
        totalGoal,
        totalCampaigns: campaigns.length
    };
    
    res
    .status(200)
    .json(new ApiResponse(200, stats, "Donation statistics retrieved successfully"));
});

export {
    addCampaign,
    editCampaign,
    getCampaigns,
    deleteCampaign,
    donationAmount,
    createDonationPaymentOrder,
    verifyDonationPayment,
    getCampaignDonors,
    getRecentDonors,
    getDonationStats
};