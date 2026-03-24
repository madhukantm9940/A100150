# A100150 Hub: Universal Push Notifier

Automated Push Notification service for the A100150 Student Hub. This Node.js function listens to Appwrite database events and dispatches notifications via FCM (Firebase Cloud Messaging).

## Features
- **Meetings**: Notifies all `selectedMemberEmails` when a new meeting is scheduled.
- **Projects**: Announces new Group and Event projects to all `eligibleMemberEmails`.
- **Points**: Provides personalized notifications to students when their AP/RP scores are updated.

## Deployment Guide (Appwrite Console)

1. **Create Function**:
   - Runtime: `Node.js 18.0+`
   - Entrypoint: `src/index.js`
   
2. **Set Triggers**:
   Add the following database triggers:
   - `databases.*.collections.meetings.documents.*.create`
   - `databases.*.collections.group_projects.documents.*.create`
   - `databases.*.collections.event_projects.documents.*.create`
   - `databases.*.collections.student_points.documents.*.update`

3. **Configure Environment Variables**:
   - `APPWRITE_FUNCTION_ENDPOINT`: Your Appwrite endpoint.
   - `APPWRITE_FUNCTION_PROJECT_ID`: Your project ID.
   - `APPWRITE_FUNCTION_API_KEY`: An API Key with `messaging.write` scopes.

## Technology Stack
- **Runtime**: Node.js
- **SDK**: `node-appwrite`
- **Communications**: Firebase Cloud Messaging (FCM) via Appwrite Messaging.
