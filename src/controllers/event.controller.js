import asyncHandler from "../utils/asyncHandler.js";
import ApiError from '../utils/ApiError.js';
import ApiResponse from "../utils/ApiResponse.js";
import Event from "../models/event.model.js";
import { emitToMultipleUsers } from "../services/socket.service.js";
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

const addEvent = asyncHandler(async (req, res) => {
    const currentUser = req.user || req.admin;
    const { title, description, date, location, time, maxAttendees, isPaid, price } = req.body;

    try {
        const event = await Event.create({
            title,
            description,
            date,
            location,
            time,
            createdBy: currentUser._id,
            maxAttendees: maxAttendees || null,
            isPaid: Boolean(isPaid),
            price: isPaid ? Number(price || 0) : 0
        });
        res.status(201).json(new ApiResponse(201, event, "Event created successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to create event");
    }
});

const getEvents = asyncHandler(async (req, res) => {
  
    try {
        const events = await Event.find().populate('participants', 'name email avatar course');
        return res
        .status(200)
        .json(new ApiResponse(200, events, "Events retrieved successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to retrieve events");
    }
});

const updateEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, date, isactive, location, time, maxAttendees, isPaid, price } = req.body;
    try {
        const event = await Event.findByIdAndUpdate(id, {
            title,
            description,
            date,
            location,
            time,
            isactive,
            maxAttendees: maxAttendees || null,
            isPaid: Boolean(isPaid),
            price: isPaid ? Number(price || 0) : 0
        }, { new: true });
        res.status(200).json(new ApiResponse(200, event, "Event updated successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to update event");
    }
});

const deleteEvent = asyncHandler(async (req, res) => {
    const { _id } = req.params;
    try {
        await Event.findByIdAndDelete(_id);
        res.status(200).json(new ApiResponse(200, null, "Event deleted successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to delete event");
    }
});

const userEventJoin = asyncHandler(async (req, res) => {

    const user = req.user;

    if (!user) {
        throw new ApiError(401, "Unauthorized: Please log in");
    }

    const { eventID } = req.params;

    if (!eventID) {
        throw new ApiError(400, "Event ID is required");
    }

    try {
        const existingEvent = await Event.findById(eventID).select('isactive participants maxAttendees isPaid');
        if (!existingEvent) {
            throw new ApiError(404, "Event not found");
        }

        if (!existingEvent.isactive) {
            throw new ApiError(400, "Event is not active");
        }

        if (existingEvent.isPaid) {
            throw new ApiError(402, "Payment is required before registering for this event");
        }

        if (existingEvent.participants.some((participantId) => participantId.toString() === user._id.toString())) {
            throw new ApiError(400, "User already joined the event");
        }

        if (existingEvent.maxAttendees !== null && existingEvent.maxAttendees !== undefined &&
            existingEvent.participants.length >= existingEvent.maxAttendees) {
            throw new ApiError(409, "This event is full");
        }

        // Repeat the capacity and duplicate checks in the update query so concurrent
        // join requests cannot overbook the event.
        const event = await Event.findOneAndUpdate(
            {
                _id: eventID,
                isactive: true,
                participants: { $ne: user._id },
                $or: [
                    { maxAttendees: null },
                    { $expr: { $lt: [{ $size: "$participants" }, "$maxAttendees"] } }
                ]
            },
            { $addToSet: { participants: user._id } },
            { new: true }
        );

        if (!event) {
            throw new ApiError(409, "This event is full or you have already joined it");
        }

        await event.populate('participants', 'name email avatar course');

        return res
        .status(200)
        .json(new ApiResponse(200, event, "User joined the event successfully"));
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, "Failed to join event");
    }
});

const createEventPaymentOrder = asyncHandler(async (req, res) => {
    const user = req.user;
    const { eventID } = req.params;
    const event = await Event.findById(eventID).select("title isactive isPaid price participants maxAttendees");

    if (!event) throw new ApiError(404, "Event not found");
    if (!event.isactive) throw new ApiError(400, "Event is not active");
    if (!event.isPaid || !event.price || event.price <= 0) {
        throw new ApiError(400, "This event does not require payment");
    }
    if (event.participants.some((participantId) => participantId.toString() === user._id.toString())) {
        throw new ApiError(400, "User already joined the event");
    }
    if (event.maxAttendees !== null && event.maxAttendees !== undefined &&
        event.participants.length >= event.maxAttendees) {
        throw new ApiError(409, "This event is full");
    }

    const order = await getRazorpay().orders.create({
        amount: Math.round(event.price * 100),
        currency: "INR",
        receipt: `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        notes: {
            eventId: event._id.toString(),
            userId: user._id.toString()
        }
    });

    return res.status(200).json(new ApiResponse(200, {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        eventTitle: event.title
    }, "Payment order created"));
});

const verifyEventPayment = asyncHandler(async (req, res) => {
    const user = req.user;
    const { eventID } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!process.env.RAZORPAY_KEY_SECRET) {
        throw new ApiError(503, "Online payments are not configured");
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new ApiError(400, "Incomplete payment verification details");
    }

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

    const expectedSignatureBuffer = Buffer.from(expectedSignature);
    const signatureBuffer = Buffer.from(razorpay_signature);
    if (expectedSignatureBuffer.length !== signatureBuffer.length ||
        !crypto.timingSafeEqual(expectedSignatureBuffer, signatureBuffer)) {
        throw new ApiError(400, "Invalid payment signature");
    }

    const order = await getRazorpay().orders.fetch(razorpay_order_id);
    if (order.notes?.eventId !== eventID ||
        order.notes?.userId !== user._id.toString() ||
        order.status !== "paid") {
        throw new ApiError(400, "Payment does not match this event registration");
    }

    const event = await Event.findOneAndUpdate(
        {
            _id: eventID,
            isactive: true,
            isPaid: true,
            participants: { $ne: user._id },
            $or: [
                { maxAttendees: null },
                { $expr: { $lt: [{ $size: "$participants" }, "$maxAttendees"] } }
            ]
        },
        { $addToSet: { participants: user._id } },
        { new: true }
    );

    if (!event) {
        throw new ApiError(409, "This event is full or you have already joined it");
    }

    await event.populate('participants', 'name email avatar course');
    return res.status(200).json(new ApiResponse(200, event, "Payment verified and event registration completed"));
});

const userEventLeave = asyncHandler(async (req, res) => {
    const user = req.user;
    const { eventID } = req.params;

    if (!eventID) {
        throw new ApiError(400, "Event ID is required");
    }

    try {
        const event = await Event.findById(eventID);

        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        const userId = user._id.toString();
        const isParticipant = event.participants.some(
            participantId => participantId && participantId.toString() === userId
        );

        if (!isParticipant) {
            throw new ApiError(400, "User has not joined the event");
        }

        event.participants = event.participants.filter(
            participantId => participantId && participantId.toString() !== userId
        );

        await event.save();
        await event.populate('participants', 'name email avatar course');

        // Emit real-time Socket.io event to remaining participants
        const participantIds = event.participants.map(p => p._id ? p._id.toString() : p.toString());
        emitToMultipleUsers(participantIds, 'event:participant:left', {
            eventId: event._id,
            userId: user._id.toString(),
            userName: user.name,
            participantCount: event.participants.length
        });

        return res
        .status(200)
        .json(new ApiResponse(200, event, "User left the event successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to leave event");
    }
});

const eventParticipants = asyncHandler(async (req, res) => {
    const { eventID } = req.params;
    try {
        const event = await Event.findById(eventID).populate('participants', 'name email avatar course');
        if (!event) {
            throw new ApiError(404, "Event not found");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, event.participants, "Event participants fetched successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to fetch event participants");
    }
});

export {
    addEvent,
    getEvents,
    updateEvent,
    deleteEvent,
    userEventJoin,
    createEventPaymentOrder,
    verifyEventPayment,
    userEventLeave,
    eventParticipants
};