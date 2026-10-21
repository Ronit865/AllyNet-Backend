import asyncHandler from "../utils/asyncHandler.js";
import ApiError from '../utils/ApiError.js';
import ApiResponse from "../utils/ApiResponse.js";
import Event from "../models/event.model.js";
import { emitToMultipleUsers } from "../services/socket.service.js";

const addEvent = asyncHandler(async (req, res) => {
    const currentUser = req.user || req.admin;
    const { title, description, date, location, time } = req.body;

    try {
        const event = await Event.create({
            title,
            description,
            date,
            location,
            time,
            createdBy: currentUser._id
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
    const { title, description, date, isactive , location, time } = req.body;
    try {
        const event = await Event.findByIdAndUpdate(id, {
            title,
            description,
            date,
            location,
            time,
            isactive
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
        const event = await Event.findById(eventID);

        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        if (!event.isactive) {
            throw new ApiError(400, "Event is not active");
        }

        if (event.participants.includes(user._id)) {
            throw new ApiError(400, "User already joined the event");
        }

        event.participants.push(user._id);

        await event.save();

        await event.populate('participants', 'name email avatar course');

        return res
        .status(200)
        .json(new ApiResponse(200, event, "User joined the event successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to join event");
    }
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
    userEventLeave,
    eventParticipants
};