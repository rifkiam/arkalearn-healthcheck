import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import * as schedule from "node-schedule";
import * as dotenv from "dotenv";

dotenv.config()
// Replace with your bot token
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Replace with your chat ID
const chatId = process.env.TELEGRAM_CHAT_ID;

// Domain/IP to check
const healthCheckUrl = process.env.HEALTH_CHECK_URL;

// Health check function
const checkHealth = async (url) => {
  try {
    const response = await axios.get(url);
    return { status: 'healthy', code: response.status };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
};

// Notify user
const notifyUser = async (message) => {
  await bot.sendMessage(chatId, message);
};

// Periodic health check (every 30 minutes)
setInterval(async () => {
  const result = await checkHealth(healthCheckUrl);

  if (result.status === 'unhealthy') {
    await notifyUser(`❌ ALERT: ${healthCheckUrl} is down! Error: ${result.message}`);
  }
  else if (result.status === 'healthy') {
    await notifyUser(`✅ ALERT: ${healthCheckUrl} is good!`);
  }
}, 20 * 60 * 1000); // 30 minutes in milliseconds

// Daily summary at 9 AM (Western Indonesia Time - UTC+7)
schedule.scheduleJob({ hour: 2, minute: 0, tz: 'Etc/UTC' }, async () => {
  const result = await checkHealth(healthCheckUrl);

  const message =
    result.status === 'healthy'
      ? `✅ Daily Update: ${healthCheckUrl} is healthy. Response code: ${result.code}`
      : `❌ Daily Update: ${healthCheckUrl} is down! Error: ${result.message}`;

  await notifyUser(message);
});

// Listen for manual health check command
bot.onText(/\/healthcheck/, async (msg) => {
  const userChatId = msg.chat.id;

  const result = await checkHealth(healthCheckUrl);

  const message =
    result.status === 'healthy'
      ? `✅ ${healthCheckUrl} is healthy. Response code: ${result.code}`
      : `❌ ${healthCheckUrl} is down! Error: ${result.message}`;

  await bot.sendMessage(userChatId, message);
});

// Default response
bot.on('message', (msg) => {
  if (!msg.text.startsWith('/healthcheck')) {
    bot.sendMessage(msg.chat.id, 'Use /healthcheck to manually check health.');
  }
});