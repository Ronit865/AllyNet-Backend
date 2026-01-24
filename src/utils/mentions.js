import User from '../models/user.model.js';
import { createNotification } from '../controllers/notification.controller.js';

/**
 * Process mentions in content and create notifications
 * @param {string} content - The content containing mentions
 * @param {string} senderId - ID of the user sending the content
 * @param {string} postId - ID of the related post
 * @param {string} [commentId] - ID of the related comment (optional)
 * @param {string} type - 'post' or 'comment' to distinguish context
 */
export const processMentions = async (content, senderId, postId, commentId = null, type = 'post') => {
    try {
        // Extract mentions: matches @Name or @Name Name (up to 2 words for simplicity, or we can look for specific format)
        // For now, let's assume mentions are single words or we need a better strategy if users have spaces.
        // A common simple strategy is capturing @word 

        const mentionRegex = /@(\w+)/g;
        const matches = content.match(mentionRegex);

        if (!matches) return;

        // Get unique names (remove @)
        const mentionedNames = [...new Set(matches.map(m => m.substring(1)))];

        for (const name of mentionedNames) {
            // Find user by first name or fuzzy match
            // This is a basic implementation. In production, we'd want a proper username/handle system.
            const user = await User.findOne({
                name: { $regex: new RegExp(`^${name}`, 'i') }
            });

            if (user && user._id.toString() !== senderId.toString()) {
                await createNotification({
                    recipient: user._id,
                    sender: senderId,
                    type: 'mention',
                    title: 'You were mentioned',
                    message: `${type === 'post' ? 'In a post' : 'In a comment'}: ${content.substring(0, 50)}...`,
                    postId,
                    commentId
                });
            }
        }
    } catch (error) {
        console.error("Error processing mentions:", error);
        // Don't fail the request just because mentions failed
    }
};
