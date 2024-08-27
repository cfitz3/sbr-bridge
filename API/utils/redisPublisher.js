const { redisPublisherClient } = require('./redisClient');
const { v4: uuidv4 } = require('uuid');

// Function to publish a message to the Redis channel
async function publishMessage(channel, message, colouredMessage) {
  // Define the regular expression for guild messages
  const guildMessagePattern = /^Guild > \[.*\] .*: .*/;

  // Check if the message matches the guild message pattern
  if (guildMessagePattern.test(message)) {
    // Ensure the Redis client is connected before using it
    if (!redisPublisherClient.isOpen) {
      console.error('Redis publisher client is not connected');
      return;
    }

    // Publish the message to the Redis server using async/await
    try {
      const messageId = uuidv4(); // Generate a unique identifier for the message
      const payload = JSON.stringify({ messageId, message });
      const reply = await redisPublisherClient.publish(channel, payload);
      console.log(`Message published to Redis channel '${channel}': ${reply}`);
      console.log(`Message ID: ${payload}`);

    } catch (err) {
      console.error('Error publishing message to Redis:', err);
    }
  }
}

module.exports = { publishMessage };