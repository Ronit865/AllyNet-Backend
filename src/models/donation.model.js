import mongoose from "mongoose";


const donationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: ""
    },
    goal: {
        type: Number,
        required: true,
    },
    raisedAmount: {
        type: Number,
        default: 0,
    },
    endDate: {
        type: Date,
    },
    category: {
        type: String,
        default: ""
    },
    donors: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            amount: {
                type: Number,
                required: true,
                min: 0
            },
            paymentId: {
                type: String,
                required: false,
                index: true
            },
            paymentIds: {
                type: [String],
                default: []
            },
            payments: [{
                paymentId: {
                    type: String,
                    required: true
                },
                orderId: {
                    type: String,
                    required: true
                },
                amount: {
                    type: Number,
                    required: true,
                    min: 0
                },
                paidAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            donatedAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, { timestamps: true });

const Donation = mongoose.model("Donation", donationSchema);

export default Donation;