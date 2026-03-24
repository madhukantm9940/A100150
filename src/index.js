const sdk = require('node-appwrite');

/**
 * Universal Push Notifier - A100150 Hub
 * Diagnostic Version - To resolve SDK constructor issues
 */
module.exports = async function (context) {
    const { Client, Messaging, ID } = sdk;

    const client = new Client();
    const messaging = new Messaging(client);

    // Initialize with environment variables
    client
        .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
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

        context.log(`Dispatching to ${targetEmails.length} targets...`);

        // In SDK v13+, createMessage was renamed to createPush for push notifications
        await messaging.createPush(
            ID.unique(),
            title,
            body,
            [], // Topics
            [], // Users
            targetEmails, // Targets (FCM tokens registered as push targets)
            true, // Draft
            false, // Scheduled
        );

        return context.res.json({
            success: true,
            message: `Dispatched ${title} to ${targetEmails.length} targets`
        });

    } catch (err) {
        context.error(`Notification Error: ${err.message}`);
        return context.res.json({ error: err.message }, 500);
    }
};
