const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

// Carga las variables de entorno desde el archivo .env
dotenv.config();

// Configuración de web scraping
const mercadoLibreURL = process.env.MERCADOLIBRE_URL || '';
let previousHouseData = [];

async function scrapeMercadoLibre() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(mercadoLibreURL);

  // Extrae información de las casas en la página
  const houses = await page.evaluate(() => {
    const houseElements = Array.from(document.querySelectorAll('.ui-search-layout__item'));
    return houseElements.map((houseElement) => {
      const title = (houseElement?.querySelector('.ui-search-item__group__element.ui-search-item__title-grid.shops__items-group-details')?.textContent || '').trim();
      const price = (houseElement?.querySelector('.andes-money-amount__fraction')?.textContent || '').trim();
      return `${title} - ${price}`;
    });
  });

  // Compara los datos de las nuevas casas con los anteriores
  const newHouses = houses.filter((houseData) => !previousHouseData.includes(houseData));

  // Si hay nuevas casas, envía un mensaje a Telegram
  if (newHouses.length > 0) {
    console.log('Nuevas casas encontradas:');
    newHouses.forEach((newHouse) => {
      console.log(newHouse);
    });

    // Mensaje a enviar a Telegram
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const chatId = process.env.TELEGRAM_CHAT_ID || '';
    const message = `¡Nueva casa disponible en MercadoLibre!\n${newHouses.join('\n')}`;

    await sendTelegramMessage(message)
  } else {
    console.log('No se encontraron nuevas casas.');
  }

  // Actualiza los datos anteriores
  previousHouseData = houses;

  await browser.close();
}

async function sendTelegramMessage(message) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || '';

  const apiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  const requestBody = {
    chat_id: chatId,
    text: message,
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    console.error('Error al enviar el mensaje a Telegram:', error.message);
  }
}

// Ejecuta la función de web scraping a intervalos regulares
const intervalMinutes = 30; // Intervalo en minutos
setInterval(scrapeMercadoLibre, intervalMinutes * 60 * 1000);
