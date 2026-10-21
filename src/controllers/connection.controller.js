import { Connection } from "../models/connection.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createNotification } from "./notification.controller.js";
import { emitConnectionRequest, emitConnectionAccepted, emitConnectionRejected } from "../services/socket.service.js";

// Send connection request
export const sendConnectionRequest = asyncHandler(async (req, res) => {
  const { recipientId } = req.body;

  if (!recipientId) {
    throw new ApiError(400, "Recipient ID is required");
  }

  if (recipientId === req.user._id.toString()) {
    throw new ApiError(400, "Cannot send connection request to yourself");
  }

  // Check if connection already exists
  const existingConnection = await Connection.findOne({
    $or: [
      { requester: req.user._id, recipient: recipientId },
      { requester: recipientId, recipient: req.user._id }
    ]
  });

  if (existingConnection) {
    if (existingConnection.status === 'pending') {
      throw new ApiError(400, "Connection request already pending");
    }
    if (existingConnection.status === 'accepted') {
      throw new ApiError(400, "Already connected");
    }
  }

  // Create connection request
  const connection = await Connection.create({
    requester: req.user._id,
    recipient: recipientId,
    status: 'pending'
  });

  const populatedConnection = await Connection.findById(connection._id)
    .populate('requester', 'name avatar email')
    .populate('recipient', 'name avatar email');

  // Create notification
  await createNotification({
    recipient: recipientId,
    sender: req.user._id,
    type: 'connection',
    title: `${req.user.name} sent you a connection request`,
    message: 'wants to connect with you'
  });

  // Emit real-time Socket.io event
  emitConnectionRequest(recipientId, populatedConnection);

  res.status(201).json(
    new ApiResponse(201, populatedConnection, "Connection request sent successfully")
  );
});

// Accept connection request
export const acceptConnectionRequest = asyncHandler(async (req, res) => {
  const { connectionId } = req.params;

  const connection = await Connection.findById(connectionId);

  if (!connection) {
    throw new ApiError(404, "Connection request not found");
  }

  if (connection.recipient.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to accept this request");
  }

  if (connection.status !== 'pending') {
    throw new ApiError(400, "Connection request is not pending");
  }

  connection.status = 'accepted';
  await connection.save();

  const populatedConnection = await Connection.findById(connectionId)
    .populate('requester', 'name avatar email')
    .populate('recipient', 'name avatar email');

  // Create notification for requester
  await createNotification({
    recipient: connection.requester,
    sender: req.user._id,
    type: 'connection',
    title: `${req.user.name} accepted your connection request`,
    message: 'You are now connected'
  });

  // Emit real-time Socket.io event
  emitConnectionAccepted(connection.requester.toString(), populatedConnection);

  res.status(200).json(
    new ApiResponse(200, populatedConnection, "Connection request accepted")
  );
});

// Reject connection request
export const rejectConnectionRequest = asyncHandler(async (req, res) => {
  const { connectionId } = req.params;

  const connection = await Connection.findById(connectionId);

  if (!connection) {
    throw new ApiError(404, "Connection request not found");
  }

  if (connection.recipient.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to reject this request");
  }

  connection.status = 'rejected';
  await connection.save();

  // Emit real-time Socket.io event
  emitConnectionRejected(connection.requester.toString(), { connectionId });

  res.status(200).json(
    new ApiResponse(200, {}, "Connection request rejected")
  );
});

// Get connection status with a user
export const getConnectionStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const connection = await Connection.findOne({
    $or: [
      { requester: req.user._id, recipient: userId },
      { requester: userId, recipient: req.user._id }
    ]
  });

  if (!connection) {
    return res.status(200).json(
      new ApiResponse(200, { status: 'none' }, "No connection found")
    );
  }

  const isRequester = connection.requester.toString() === req.user._id.toString();

  res.status(200).json(
    new ApiResponse(200, {
      status: connection.status,
      connectionId: connection._id,
      isRequester
    }, "Connection status retrieved")
  );
});

// Get all connections
export const getConnections = asyncHandler(async (req, res) => {
  const { status = 'accepted' } = req.query;

  try {
    const connections = await Connection.find({
      $or: [
        { requester: req.user._id, status },
        { recipient: req.user._id, status }
      ]
    })
      .populate('requester', 'name avatar email graduationYear currentPosition company')
      .populate('recipient', 'name avatar email graduationYear currentPosition company')
      .sort({ createdAt: -1 });

    // Transform data to show the other user
    const transformedConnections = connections
      .filter(conn => conn.requester && conn.recipient) // Filter out connections with missing users
      .map(conn => {
        const isRequester = conn.requester._id.toString() === req.user._id.toString();
        return {
          _id: conn._id,
          user: isRequester ? conn.recipient : conn.requester,
          status: conn.status,
          connectedAt: conn.updatedAt
        };
      });

    res.status(200).json(
      new ApiResponse(200, transformedConnections, "Connections retrieved successfully")
    );
  } catch (error) {
    console.error("Error in getConnections:", error);
    throw new ApiError(500, `Failed to retrieve connections: ${error.message}`);
  }
});

// Get pending connection requests
export const getPendingRequests = asyncHandler(async (req, res) => {
  const connections = await Connection.find({
    recipient: req.user._id,
    status: 'pending'
  })
    .populate('requester', 'name avatar email graduationYear currentPosition company')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, connections, "Pending requests retrieved successfully")
  );
});

// Remove connection
export const removeConnection = asyncHandler(async (req, res) => {
  const { connectionId } = req.params;

  const connection = await Connection.findById(connectionId);

  if (!connection) {
    throw new ApiError(404, "Connection not found");
  }

  const isInvolved = 
    connection.requester.toString() === req.user._id.toString() ||
    connection.recipient.toString() === req.user._id.toString();

  if (!isInvolved) {
    throw new ApiError(403, "You are not authorized to remove this connection");
  }

  await Connection.findByIdAndDelete(connectionId);

  res.status(200).json(
    new ApiResponse(200, {}, "Connection removed successfully")
  );
});
