import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    time:{
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    maxAttendees: {
        type: Number,
        min: 1,
        default: null
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        min: 0,
        default: 0
    },
    isactive: {
        type: Boolean,
        default: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true });

const Event = mongoose.model("Event", eventSchema);

export default Event;