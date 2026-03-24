const sdk = require('node-appwrite');

/**
 * Universal Push Notifier - A100150 Hub
 * Standard Logic for: Meetings, Projects, and Points
 */
module.exports = async function (context) {
    const client = new sdk.Client();
    const messaging = new sdk.Messaging(client);

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
                title = '📅 New Meeting Scheduled';
                body = `${payload.title}\nPurpose: ${payload.purpose}`;
                targetEmails = payload.selectedMemberEmails || [];
            }
        } 
        
        // --- 2. PROJECT NOTIFICATIONS ---
        else if (event.includes('collections.group_projects') || event.includes('collections.event_projects')) {
            if (event.includes('.create')) {
                const type = event.includes('group_projects') ? 'Group' : 'Event';
                title = `🚀 New ${type} Project`;
                body = `${payload.title}\nStatus: ${payload.status || 'Active'}`;
                targetEmails = payload.eligibleMemberEmails || [];
            }
        } 
        
        // --- 3. POINT UPDATE NOTIFICATIONS ---
        else if (event.includes('collections.student_points')) {
            if (event.includes('.update')) {
                title = '📊 Points Updated!';
                body = `Your score: AP: ${payload.ap} | RP: ${payload.rp}\nKeep it up!`;
                targetEmails = [payload.email]; // Individual notification
            }
        }

        // --- 4. EXECUTION ---
        if (targetEmails.length === 0) {
            context.log('No eligible targets found for this event.');
            return context.res.json({ message: 'No targets identified' });
        }

        context.log(`Dispatching to ${targetEmails.length} targets...`);

        // We use the 'fcm' provider and identifiers (which we set as FCM tokens in the app)
        await messaging.createMessage(
            sdk.ID.unique(),
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
