const sdk = require('node-appwrite');

/**
 * Universal Push Notifier - A100150 Hub
 * Diagnostic Version - To resolve SDK constructor issues
 */
module.exports = async function (context) {
    const Client = sdk.Client || (sdk.default ? sdk.default.Client : null);
    const Messaging = sdk.Messaging || (sdk.default ? sdk.default.Messaging : null);
    const Users = sdk.Users || (sdk.default ? sdk.default.Users : null);
    const Query = sdk.Query || (sdk.default ? sdk.default.Query : null);
    const ID = sdk.ID || (sdk.default ? sdk.default.ID : null);

    if (!Client || !Messaging || !Users) {
        throw new Error('Could not initialize Appwrite SDK services. Please check node-appwrite version.');
    }

    const client = new Client();
    const messaging = new Messaging(client);
    const users = new Users(client);

    // Initialize with environment variables (with fallback for regional SGP endpoint)
    client
        .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

    try {
        const payload = context.req.body;
        // The event header tells us which collection triggered the function
        const event = context.req.headers['x-appwrite-event'] || '';
        
        let title = 'A100150 Hub Update';
        let body = 'You have a new update in your student hub.';
        let targetEmails = [];

        context.log(`Event Triggered: ${event}`);

        // --- 1. MEETING NOTIFICATIONS ---
        if (event.includes('collections.meetings')) {
            if (event.includes('.create')) {
                title = '📅 New Sync Scheduled';
                body = `Topic: ${payload.title}\n"${payload.purpose}"`;
                targetEmails = payload.selectedMemberEmails || [];
            }
        } 
        
        // --- 2. PROJECT NOTIFICATIONS ---
        else if (event.includes('collections.group_projects')) {
            if (event.includes('.create')) {
                title = '🚀 New Group Project';
                body = `Project: ${payload.title}\nTrack: ${payload.track || 'A100150'}`;
                targetEmails = payload.eligibleMemberEmails || [];
            }
        }
        else if (event.includes('collections.event_projects')) {
            if (event.includes('.create')) {
                title = '🏆 New Event Challenge';
                body = `Event: ${payload.title}\nDon't miss out!`;
                targetEmails = payload.eligibleMemberEmails || [];
            }
        }
        
        // --- 3. POINT UPDATE NOTIFICATIONS ---
        else if (event.includes('collections.student_points')) {
            if (event.includes('.update')) {
                title = '📈 Dashboard Update';
                body = `Your weekly sync is complete!\nAP: ${payload.ap} | RP: ${payload.rp}`;
                targetEmails = [payload.email];
            }
        }

        // --- 4. EXECUTION ---
        if (targetEmails.length === 0) {
            context.log('No eligible targets found for this event.');
            return context.res.json({ message: 'No targets identified' });
        }

        context.log(`Dispatching to ${targetEmails.length} emails...`);

        // Resolve emails to actual Appwrite User IDs (UIDs must be < 36 chars and alphanumeric)
        const userList = await users.list([
            Query.equal('email', targetEmails)
        ]);
        const userIds = userList.users.map(u => u.$id);
        
        context.log(`Resolved ${userIds.length} User IDs from ${targetEmails.length} emails.`);

        if (userIds.length === 0) {
            context.log('No registered users found for these emails.');
            return context.res.json({ message: 'No registered recipients' });
        }

        // In SDK v14+, the positional signature is very long: 
        // (messageId, title, body, topics, users, targets, data, action, image, icon, sound, color, tag, badge, draft, scheduledAt...)
        const response = await messaging.createPush(
            ID.unique(),
            title,
            body,
            [],    // 4: Topics
            userIds, // 5: Users
            [],    // 6: Targets
            null,  // 7: Data
            null,  // 8: Action
            null,  // 9: Image
            null,  // 10: Icon
            null,  // 11: Sound
            null,  // 12: Color
            null,  // 13: Tag
            null,  // 14: Badge
            false, // 15: Draft (MUST BE FALSE TO SEND)
            null   // 16: Scheduled
        );

        context.log(`Push Delivery Successful: ${JSON.stringify(response)}`);

        return context.res.json({
            success: true,
            message: `Dispatched ${title} to ${userIds.length} users`
        });

    } catch (err) {
        context.error(`Notification Error: ${err.message}`);
        context.log(`FIXED LOG: ${err.message}. Stack: ${err.stack}`);
        return context.res.json({ error: err.message }, 500);
    }
};
