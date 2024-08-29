const redis = require('redis');
const { v4: uuidv4 } = require('uuid');

const processedMessageIds = new Set();

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

    } catch (err) {
      console.error('Error publishing message to Redis:', err);
    }
  }
}

// Function to handle invite messages
async function handleInviteTrigger(username) {
  try {
    bot.chat(`/g invite ${username}`);
    
    console.log(`Successfully invited ${username} to the guild.`);
  } catch (error) {
    console.error('Error inviting user:', error);
  }
}

// Function to process incoming messages
function handleRedisMessage(messageId, message, colouredMessage) {
  if (processedMessageIds.has(messageId)) {
    return; 
  }

  // Mark the message as processed to avoid handling it again
  processedMessageIds.add(messageId);
}

// Function to handle messages for invites
function handleInviteMessage(messageId, triggerkeyword, username ) {
  if (processedMessageIds.has(messageId)) {
    return; 
  }


  try {
    const parsedPayload = { messageId, triggerkeyword, username }
  
    if (parsedPayload.triggerkeyword === 'invite') {
      handleInviteTrigger(parsedPayload.username); 
    } else {
      console.log('Unhandled trigger:', parsedPayload.triggerkeyword);
    }
  } catch (error) {
    console.error('Error processing Redis invite message:', error);
  }
  processedMessageIds.add(messageId);
}

// Subscribe to a Redis channel and handle incoming messages
async function subscribeToChannel(channel, messageHandler) {
  try {
    if (!redisSubscriberClient.isOpen) {
      await redisSubscriberClient.connect();
    }
    await redisSubscriberClient.subscribe(channel, (message) => {
      try {
        const parsedPayload = JSON.parse(message); 
        messageHandler(parsedPayload.messageId, parsedPayload.message, parsedPayload.colouredMessage); 
      } catch (parseError) {
        console.error('Error parsing message:', parseError);
      }
    });
  } catch (err) {
    console.error('Redis connection error:', err); 
  }
}

// Subscribe to a specific channel for invite triggers
async function subscribeToInviteChannel(channel) {
  try {
    if (!redisSubscriberClient.isOpen) {
      await redisSubscriberClient.connect();
    }
    await redisSubscriberClient.subscribe(channel, (message) => {
      try {
        const parsedPayload = JSON.parse(message); 
        handleInviteMessage(parsedPayload.messageId, parsedPayload.triggerKeyword, parsedPayload.username); // Call the handler for invite messages
      } catch (parseError) {
        console.error('Error parsing invite message:', parseError); 
      }
    });
  } catch (err) {
    console.error('Redis connection error for invite channel:', err); 
  }
}

module.exports = {
  redisPublisherClient,
  redisSubscriberClient,
  publishMessage,
  subscribeToChannel,
  subscribeToInviteChannel, 
  handleRedisMessage,  
  handleInviteMessage, 
  handleInviteTrigger, 
};