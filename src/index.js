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
        // The event/trigger tells us what triggered the function
        const event = context.req.headers['x-appwrite-event'] || '';
        const trigger = context.req.headers['x-appwrite-trigger'] || '';
        
        let title = 'A100150 Hub Update';
        let body = 'You have a new update in your student hub.';
        let targetEmails = [];
        let userIds = [];

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

        // --- 4. WEEKLY REMINDER (SCHEDULED) ---
        else if (trigger === 'schedule') {
            title = '🗓️ Weekly Sync Reminder';
            body = 'It\'s time to update your AP and RP marks for this week!';
            // Fetch all users to notify everyone
            try {
                const allUsers = await users.list();
                userIds = allUsers.users.map(u => u.$id);
                context.log(`Scheduled task: Targeting all ${userIds.length} registered users.`);
            } catch (userError) {
                context.error(`Error fetching users: ${userError.message}`);
                return context.res.json({ error: 'Failed to fetch user list' }, 500);
            }
        }

        // --- 4. EXECUTION ---
        if (targetEmails.length === 0) {
            context.log('No eligible targets found for this event.');
            return context.res.json({ message: 'No targets identified' });
        }

        if (userIds.length === 0 && targetEmails.length > 0) {
            context.log(`Dispatching to ${targetEmails.length} emails...`);

            // Resolve emails to actual Appwrite User IDs
            const userList = await users.list([
                Query.equal('email', targetEmails)
            ]);
            userIds = userList.users.map(u => u.$id);
            
            context.log(`Resolved ${userIds.length} User IDs from ${targetEmails.length} emails.`);
        }

        if (userIds.length === 0) {
            context.log('No registered users found for these emails.');
            return context.res.json({ message: 'No registered recipients' });
        }

        // Determine data payload for client-side navigation
        const pushData = {
            type: trigger === 'schedule' ? 'reminder' : (event.includes('student_points') ? 'pointUpdate' : (event.includes('meetings') ? 'meeting' : 'project'))
        };

        const response = await messaging.createPush(
            ID.unique(),
            title,
            body,
            [],       // 4: Topics
            userIds,  // 5: Users
            [],       // 6: Targets
            null,     // 7: ScheduledAt
            pushData  // 8: Data
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
