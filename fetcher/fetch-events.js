#!/usr/bin/env node

import puppeteer from 'puppeteer';

const URL = 'https://www.5rhythms.com/EventSearch.php?validate_event_level=&event_type_id=2&event_country=&event_state=&event_city%5B%5D=&event_days%5B%5D=&event_startDate=mm%2Fdd%2Fyy&event_endDate=mm%2Fdd%2Fyy&location_lat=&location_long=&findIt=FIND+IT&isAdvancedSearch=1&SearchName=&SearchEvent=&event_level_id%5B%5D=';
const BASE_URL = 'https://www.5rhythms.com';

// Delay between fetches to avoid overloading the website (in milliseconds)
const FETCH_DELAY_MS = 1000;

// Helper to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Month name to number mapping
const MONTH_MAP = {
  'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
  'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
  'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
};

// Helper to parse date string like "10 Dec 2025" to "251210"
function formatDateString(dateStr) {
  const match = dateStr.trim().match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
  if (!match) return '';
  const [, day, month, year] = match;
  const yy = year.slice(2);
  const mm = MONTH_MAP[month] || '00';
  const dd = day.padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

// Get yesterday's date in YYMMDD format for comparison
function getYesterdayYYMMDD() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yy = String(yesterday.getFullYear()).slice(2);
  const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
  const dd = String(yesterday.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

// Check if an event is in the past (both dates before yesterday)
function isEventInPast(event, yesterdayYYMMDD) {
  // If no dates, keep the event (on-demand without dates)
  if (!event.date_from && !event.date_to) {
    return false;
  }
  // If both dates exist and are before yesterday, it's in the past
  const dateFrom = event.date_from || '';
  const dateTo = event.date_to || '';
  return dateFrom < yesterdayYYMMDD && dateTo < yesterdayYYMMDD;
}

// Fetch dates from an event detail page
async function fetchEventDates(page, eventUrl) {
  try {
    await page.goto(eventUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    const dates = await page.evaluate(() => {
      // Look for date text in the page content
      // The format is typically "DD Mon YYYY - DD Mon YYYY" or "DD Mon YYYY"
      const bodyText = document.body.innerText;

      // Match date range pattern: "1 Aug 2023 - 29 Aug 2023" or "22 Apr 2022 - 25 Apr 2022"
      const rangeMatch = bodyText.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s*-\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/);
      if (rangeMatch) {
        return { dateFrom: rangeMatch[1], dateTo: rangeMatch[2] };
      }

      // Match single date pattern
      const singleMatch = bodyText.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/);
      if (singleMatch) {
        return { dateFrom: singleMatch[1], dateTo: singleMatch[1] };
      }

      return null;
    });

    return dates;
  } catch (error) {
    console.error(`Error fetching dates from ${eventUrl}: ${error.message}`);
    return null;
  }
}

async function fetchEvents() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.error('Fetching events from 5Rhythms...');

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#searchresults_classes', { timeout: 30000 });

  const events = await page.evaluate((baseUrl) => {
    const container = document.querySelector('#searchresults_classes');
    if (!container) {
      return { error: 'Could not find searchresults_classes container' };
    }

    const rows = container.querySelectorAll('#searchresults_rows');
    const results = [];

    // Helper to parse links in a cell
    function parseCell(cell) {
      if (!cell) return null;

      const links = cell.querySelectorAll('a');

      if (links.length === 0) {
        return cell.textContent.trim();
      }

      if (links.length === 1) {
        const link = links[0];
        // Skip contact form links
        if (link.getAttribute('href')?.startsWith('#')) {
          const fullText = cell.textContent.trim();
          const linkText = link.textContent.trim();
          const otherText = fullText.replace(linkText, '').trim();
          return otherText || fullText;
        }
        return {
          title: link.textContent.trim(),
          url: link.href
        };
      }

      // Multiple links (e.g., multiple teachers or map levels)
      const linkData = [];
      links.forEach(link => {
        if (!link.getAttribute('href')?.startsWith('#')) {
          linkData.push({
            title: link.textContent.trim(),
            url: link.href
          });
        }
      });

      if (linkData.length === 0) {
        return cell.textContent.trim();
      }

      if (linkData.length === 1) {
        return linkData[0];
      }

      return linkData;
    }

    // Month name to number mapping
    const monthMap = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    // Helper to parse date string like "10 Dec 2025" to "251210"
    function formatDate(dateStr) {
      const match = dateStr.trim().match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
      if (!match) return '';
      const [, day, month, year] = match;
      const yy = year.slice(2);
      const mm = monthMap[month] || '00';
      const dd = day.padStart(2, '0');
      return `${yy}${mm}${dd}`;
    }

    // Helper to parse dates field into is_ondemand, date_from, date_to
    function parseDates(datesText) {
      if (!datesText) {
        return { is_ondemand: true, date_from: '', date_to: '' };
      }

      const text = datesText.trim();

      // Check for on-demand events
      if (text.toLowerCase() === 'on-demand') {
        return { is_ondemand: true, date_from: '', date_to: '' };
      }

      // Check for date range: "10 Dec 2025 -  14 Dec 2025"
      const rangeMatch = text.match(/^(.+?)\s+-\s+(.+)$/);
      if (rangeMatch) {
        const dateFrom = formatDate(rangeMatch[1]);
        const dateTo = formatDate(rangeMatch[2]);
        return { is_ondemand: false, date_from: dateFrom, date_to: dateTo };
      }

      // Single date: "10 Dec 2025"
      const singleDate = formatDate(text);
      if (singleDate) {
        return { is_ondemand: false, date_from: singleDate, date_to: singleDate };
      }

      // Fallback for unrecognized format
      return { is_ondemand: true, date_from: '', date_to: '' };
    }

    // Helper to get contact info (phone numbers, excluding email links)
    function parseContactInfo(cell) {
      if (!cell) return null;

      const result = {};
      const emailLink = cell.querySelector('a[href^="#search_result_contact_form"]');

      if (emailLink) {
        result.hasContactForm = true;
        result.teacherId = emailLink.getAttribute('data-teacher');
      }

      // Get phone number - text content excluding the email link text
      const fullText = cell.textContent.trim();
      const linkText = emailLink ? emailLink.textContent.trim() : '';
      const phone = fullText.replace(linkText, '').trim();

      if (phone) {
        result.phone = phone;
      }

      return Object.keys(result).length > 0 ? result : null;
    }

    rows.forEach(row => {
      const event = {};

      // Name
      const nameCell = row.querySelector('#name');
      const nameData = parseCell(nameCell);
      if (nameData && typeof nameData === 'object') {
        event.name = nameData.title;
        event.url = nameData.url;
      } else {
        event.name = nameData;
      }

      // Dates
      const datesCell = row.querySelector('#dates');
      const datesText = datesCell ? datesCell.textContent.trim() : null;
      const dateInfo = parseDates(datesText);
      event.is_ondemand = dateInfo.is_ondemand;
      event.date_from = dateInfo.date_from;
      event.date_to = dateInfo.date_to;

      // Teacher(s)
      const teacherCell = row.querySelector('#teacher');
      const teacherData = parseCell(teacherCell);
      if (Array.isArray(teacherData)) {
        event.teachers = teacherData;
      } else if (teacherData && typeof teacherData === 'object') {
        event.teachers = [teacherData];
      } else if (teacherData) {
        event.teachers = [{ title: teacherData }];
      }

      // Map (level/type)
      const mapCell = row.querySelector('#map');
      const mapData = parseCell(mapCell);
      if (Array.isArray(mapData)) {
        event.levels = mapData;
      } else if (mapData && typeof mapData === 'object') {
        event.levels = [mapData];
      } else if (mapData) {
        event.level = mapData;
      }

      // Special case: "God, Sex and the Body" uses its name as the level
      if (event.name === 'God, Sex and the Body') {
        delete event.levels;
        event.level = 'God, Sex and the Body';
      }

      // City
      const cityCell = row.querySelector('#city');
      event.city = cityCell ? cityCell.textContent.trim() : null;

      // Country
      const countryCell = row.querySelector('#country');
      event.country = countryCell ? countryCell.textContent.trim() : null;

      // Contact Info
      const contactCell = row.querySelector('#contactInfo');
      const contactData = parseContactInfo(contactCell);
      if (contactData) {
        event.contact = contactData;
      }

      results.push(event);
    });

    return results;
  }, BASE_URL);

  return { events, browser, page };
}

// Second pass: fetch dates for on-demand events
async function fetchOnDemandDates(events, page) {
  const onDemandEvents = events.filter(e => e.is_ondemand && e.url);

  if (onDemandEvents.length === 0) {
    return events;
  }

  console.error(`Fetching dates for ${onDemandEvents.length} on-demand events...`);

  for (let i = 0; i < onDemandEvents.length; i++) {
    const event = onDemandEvents[i];
    console.error(`  [${i + 1}/${onDemandEvents.length}] ${event.name}`);

    const dates = await fetchEventDates(page, event.url);

    if (dates) {
      event.date_from = formatDateString(dates.dateFrom);
      event.date_to = formatDateString(dates.dateTo);
      if (event.date_from && event.date_to) {
        event.is_ondemand = false;
        console.error(`    -> ${dates.dateFrom} - ${dates.dateTo}`);
      }
    }

    // Rate limiting: wait before the next fetch (except for the last one)
    if (i < onDemandEvents.length - 1) {
      await delay(FETCH_DELAY_MS);
    }
  }

  return events;
}

async function main() {
  let browser;
  try {
    const result = await fetchEvents();
    browser = result.browser;

    if (!result.events || !Array.isArray(result.events)) {
      console.error('Error: Invalid response - events data is not an array');
      process.exit(1);
    }

    if (result.events.length === 0) {
      console.error('Error: No events found from source');
      process.exit(1);
    }

    // Second pass: fetch dates for on-demand events
    const events = await fetchOnDemandDates(result.events, result.page);

    // Filter out events that are in the past
    const yesterdayYYMMDD = getYesterdayYYMMDD();
    const currentEvents = events.filter(event => !isEventInPast(event, yesterdayYYMMDD));

    console.error(`Filtered out ${events.length - currentEvents.length} past events`);

    if (currentEvents.length === 0) {
      console.error('Error: No current events remaining after filtering past events');
      process.exit(1);
    }

    const output = {
      metadata: {
        sourceUrl: URL,
        eventCount: currentEvents.length,
        fetchedAt: new Date().toISOString()
      },
      events: currentEvents
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error('Error fetching events:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
