const express = require('express');
const admin = require('firebase-admin');

// Ensure the service account key is available from environment variables
if (!process.env.SERVICE_ACCOUNT_KEY) {
  throw new Error('SERVICE_ACCOUNT_KEY environment variable is not set.');
}

// Parse the service account key from the environment variable string
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(express.json());

// Add this new endpoint to handle GET requests to the root URL
app.get('/', (req, res) => {
  res.send('Server is live and ready for POST requests!');
});

// Endpoint for sending one-to-one notifications
app.post('/send-private-notification', async (req, res) => {
  const { recipientId, senderName, messageText, senderId } = req.body;

  try {
    // Get the recipient's device tokens from Firestore
    const tokensRef = admin.firestore().collection('users').doc(recipientId).collection('tokens');
    const tokensSnapshot = await tokensRef.get();
    const tokens = tokensSnapshot.docs.map(doc => doc.id);

    if (tokens.length === 0) {
      console.log('Recipient has no device tokens.');
      return res.status(200).send('No tokens found.');
    }

    const payload = {
      notification: {
        title: `Naya Message ${senderName} se`,
        body: messageText,
      },
      data: {
        senderId: senderId,
        senderName: senderName,
        messageText: messageText
      },
    };

    // Send the notification to the device
    const response = await admin.messaging().sendToDevice(tokens, payload);
    console.log('Notification successfully sent:', response);
    res.status(200).send('Notification sent.');
  } catch (error) {
    console.error('Error sending private notification:', error);
    res.status(500).send('Error sending notification.');
  }
});

// Endpoint for sending group chat notifications
app.post('/send-group-notification', async (req, res) => {
  const { senderId, senderName, messageText } = req.body;

  try {
    // Send the notification to the group_chat topic
    const topic = 'group_chat';
    const payload = {
      notification: {
        title: `Group Message: ${senderName}`,
        body: messageText,
      },
      data: {
        senderId: senderId,
        senderName: senderName,
        messageText: messageText
      }
    };

    const response = await admin.messaging().sendToTopic(topic, payload);
    console.log('Successfully sent to topic:', response);
    res.status(200).send('Notification sent.');
  } catch (error) {
    console.error('Error sending group notification:', error);
    res.status(500).send('Error sending notification.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
