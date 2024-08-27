const redis = require('redis');
const { v4: uuidv4 } = require('uuid');

const processedMessageIds = new Set(); // Ensure this is defined at the top of your file

// Create Redis clients for publishing and subscribing
const redisPublisherClient = redis.createClient({
  url: 'redis://5.161.243.233:6379'
});

const redisSubscriberClient = redis.createClient({
  url: 'redis://5.161.243.233:6379'
});

// Error handling for publisher client
redisPublisherClient.on('error', (err) => {
  console.error('Redis publisher client error:', err);
});

// Error handling for subscriber client
redisSubscriberClient.on('error', (err) => {
  console.error('Redis subscriber client error:', err);
});

// Function to connect the Redis clients
async function connectRedis(client) {
  try {
    if (!client.isOpen) {
      await client.connect();
      console.log('Connected to Redis server');
    } else {
      console.log('Redis client already connected');
    }
  } catch (err) {
    console.error('Redis connection error:', err);
  }
}

// Connect to Redis for both clients
connectRedis(redisPublisherClient);
connectRedis(redisSubscriberClient);

// Function to publish a message to the Redis channel
async function publishMessage(channel, message, colouredMessage) {
  const guildMessagePattern = /^Guild > \[.*\] .*: .*/;

  if (guildMessagePattern.test(message)) {
    if (!redisPublisherClient.isOpen) {
      console.error('Redis publisher client is not connected');
      return;
    }

    try {
      const messageId = uuidv4();
      const payload = JSON.stringify({ messageId, message, colouredMessage });
      const reply = await redisPublisherClient.publish(channel, payload);
      console.log(`Message published to Redis channel '${channel}': ${reply}`);
      console.log(`Message ID: ${payload}`);
    } catch (err) {
      console.error('Error publishing message to Redis:', err);
    }
  }
}

// Function to process incoming messages
function handleRedisMessage(messageId, message, colouredMessage) {
  if (processedMessageIds.has(messageId)) {
    return; // If the message has already been processed, skip further processing
  }

  // Log the parsed message for debugging
  console.log('Received message from Redis:', { messageId, message, colouredMessage });

  // Mark the message as processed to avoid handling it again
  processedMessageIds.add(messageId);
}

// Function to subscribe to a Redis channel and handle incoming messages
async function subscribeToChannel(channel, messageHandler) {
  try {
    if (!redisSubscriberClient.isOpen) {
      await redisSubscriberClient.connect();
    }
    await redisSubscriberClient.subscribe(channel, (message) => {
      console.log('Payload Received:', message);
      try {
        const parsedPayload = JSON.parse(message); // Parse the incoming message JSON
        messageHandler(parsedPayload.messageId, parsedPayload.message, parsedPayload.colouredMessage); // Call the handler
      } catch (parseError) {
        console.error('Error parsing message:', parseError); // Handle JSON parse errors
      }
    });
  } catch (err) {
    console.error('Redis connection error:', err); // Handle Redis connection errors
  }
}

module.exports = {
  redisPublisherClient,
  redisSubscriberClient,
  publishMessage,
  subscribeToChannel,
  handleRedisMessage,  // Exporting the message handler function
};
