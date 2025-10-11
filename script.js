//Server Url Debug
const serverURL_Debug = 'http://127.0.0.1:5000';
const googleCloudUrl='https://eventsearcher-server.wl.r.appspot.com'
const debugMode = true // 'debug' or 'production'
// Results UI elements
const resultsTableWrapper = document.getElementById('resultsTableWrapper');
const resultsBody = document.getElementById('resultsBody');
const noResultsMessage = document.getElementById('noResultsMessage');
const autoDetectCheckbox = document.getElementById('autoDetect');
const locationInput = document.getElementById('location');
let toggleLocationHandler = null;
const eventCard = document.getElementById('eventCard');
const modalCloseButton = document.getElementById('modalCloseButton');
const modalEventTitle = document.getElementById('modalEventTitle');
const modalArtists = document.getElementById('modalArtists');
const modalDate = document.getElementById('modalDate');
const modalTime = document.getElementById('modalTime');
const modalVenue = document.getElementById('modalVenue');
const modalGenres = document.getElementById('modalGenres');
const modalPriceRange = document.getElementById('modalPriceRange');
const modalTicketStatus = document.getElementById('modalTicketStatus');
const modalBuyLink = document.getElementById('modalBuyLink');
const modalSeatMapWrapper = document.getElementById('modalSeatMapWrapper');
const modalSeatMap = document.getElementById('modalSeatMap');
// Venue detail toggle elements
const modalEventContent = document.getElementById('modalEventContent');
const modalVenueContent = document.getElementById('modalVenueContent');
const venueToggleButton = document.getElementById('venueToggleButton');
const venueToggleIcon = document.getElementById('venueToggleIcon');
const venueToggleText = document.getElementById('venueToggleText');
const venueRevealBar = document.getElementById('venueRevealBar');
const venueDetailName = document.getElementById('venueDetailName');
const venueDetailLocation = document.getElementById('venueDetailLocation');
const venueGoogleMapLink = document.getElementById('venueGoogleMapLink');
const venueMoreEventsLink = document.getElementById('venueMoreEventsLink');
let lastFocusedElement = null;

let currentVenueData = null; // cache venue info from detail object

let currentEvents = [];
let currentSort = { key: null, direction: 'asc' };
const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
const sortButtons = document.querySelectorAll('[data-sort-key]');

const TICKET_STATUS_STYLES = {
  'ONSALE': {
    label: 'On Sale',
    classes: ['bg-emerald-500/20', 'text-emerald-300', 'border-emerald-500/40']
  },
  'OFFSALE': {
    label: 'Off Sale',
    classes: ['bg-rose-500/20', 'text-rose-300', 'border-rose-500/40']
  },
  'CANCELED': {
    label: 'Canceled',
    classes: ['bg-gray-900', 'text-white', 'border-gray-600']
  },
  'POSTPONED': {
    label: 'Postponed',
    classes: ['bg-amber-500/20', 'text-amber-300', 'border-amber-500/40']
  },
  'RESCHEDULED': {
    label: 'Rescheduled',
    classes: ['bg-amber-500/20', 'text-amber-300', 'border-amber-500/40']
  }
};

const TICKET_STATUS_DEFAULT = {
  label: 'N/A',
  classes: ['bg-slate-600/20', 'text-slate-200', 'border-slate-500/40']
};

const TICKET_STATUS_ALL_CLASSES = Array.from(new Set([
  ...TICKET_STATUS_DEFAULT.classes,
  ...Object.values(TICKET_STATUS_STYLES).flatMap(item => item.classes)
]));

function resetResultsDisplay() {
  if (resultsBody) {
    resultsBody.innerHTML = '';
  }
  if (resultsTableWrapper) {
    resultsTableWrapper.classList.add('hidden');
  }
  if (noResultsMessage) {
    noResultsMessage.classList.add('hidden');
    noResultsMessage.textContent = 'No record found.';
  }
  currentEvents = [];
  currentSort = { key: null, direction: 'asc' };
  updateSortIndicators();
}

function showNoResults(message = 'No record found.') {
  if (!noResultsMessage) return;
  if (resultsTableWrapper) {
    resultsTableWrapper.classList.add('hidden');
  }
  if (resultsBody) {
    resultsBody.innerHTML = '';
  }
  noResultsMessage.textContent = message;
  noResultsMessage.classList.remove('hidden');
}

function normalizeEvents(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.events)) return payload.events;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload._embedded && Array.isArray(payload._embedded.events)) return payload._embedded.events;
  return [];
}

function getEventDateParts(event) {
  const date = event?.dates?.start?.localDate || event?.date || event?.datetime || event?.startDate || '';
  const time = event?.dates?.start?.localTime || event?.time || event?.startTime || '';
  return {
    date: date || '',
    time: time || ''
  };
}

function getEventIcon(event) {
  if (typeof event?.imageUrl === 'string' && event.imageUrl.trim()) {
    return event.imageUrl;
  } else {
    return '';
  }
}

function getEventGenre(event) {
  return event?.classifications?.[0]?.segment?.name
    || event?.genre
    || event?.type
    || 'N/A';
}

function getEventVenue(event) {
  return event?._embedded?.venues?.[0]?.name
    || event?.venue
    || event?.location
    || 'N/A';
}

function formatPipeSeparated(value) {
  if (!value) return 'N/A';
  if (Array.isArray(value)) {
    const names = value
      .map(item => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          return item.name || item.title || item.text || '';
        }
        return '';
      })
      .filter(Boolean);
    return names.length ? names.join(' | ') : 'N/A';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : 'N/A';
  }
  return 'N/A';
}

function formatPriceRange(detail) {
  if (!detail) return 'N/A';
  if (typeof detail.priceRange === 'string' && detail.priceRange.trim()) {
    return detail.priceRange.trim();
  }
  if (Array.isArray(detail.priceRanges) && detail.priceRanges.length) {
    const formatted = detail.priceRanges.map(pr => {
      if (!pr) return '';
      const currency = pr.currency || pr.currencyCode || '';
      const min = pr.min ?? pr.minPrice;
      const max = pr.max ?? pr.maxPrice;
      if (min != null && max != null) {
        return `${currency ? currency + ' ' : ''}${min} - ${currency ? currency + ' ' : ''}${max}`;
      }
      if (min != null) {
        return `${currency ? currency + ' ' : ''}${min}+`;
      }
      if (max != null) {
        return `${currency ? currency + ' ' : ''}${max}`;
      }
      return pr.type || '';
    }).filter(Boolean);
    if (formatted.length) return formatted.join(' | ');
  }

  const min = detail.minPrice ?? detail.priceMin;
  const max = detail.maxPrice ?? detail.priceMax;
  const currency = detail.currency || detail.currencyCode || '';
  if (min != null && max != null) {
    return `${currency ? currency + ' ' : ''}${min} - ${currency ? currency + ' ' : ''}${max}`;
  }
  if (min != null) {
    return `${currency ? currency + ' ' : ''}${min}+`;
  }
  if (max != null) {
    return `${currency ? currency + ' ' : ''}${max}`;
  }
  return 'N/A';
}

function extractArtistNames(source) {
  if (!source) return [];

  if (Array.isArray(source)) {
    return source
      .map(item => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const value = item.name || item.title || item.text || '';
          return typeof value === 'string' ? value.trim() : '';
        }
        return '';
      })
      .filter(Boolean);
  }

  if (typeof source === 'object') {
    const value = source.name || source.title || source.text || '';
    if (typeof value === 'string' && value.trim()) {
      return [value.trim()];
    }
    return [];
  }

  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) return [];
    if (trimmed.includes('|')) {
      return trimmed.split('|').map(part => part.trim()).filter(Boolean);
    }
    return [trimmed];
  }

  return [];
}

function normalizeUrlList(source) {
  if (!source) return [];
  if (Array.isArray(source)) {
    return source.map(url => (typeof url === 'string' ? url.trim() : ''));
  }
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) return [];
    return trimmed.split('|').map(part => part.trim());
  }
  return [];
}

function populateModalArtists(detail) {
  if (!modalArtists) return;

  const rawNames = detail?.artistsOrTeams || detail?.artists || detail?.attractions;
  const names = extractArtistNames(rawNames);
  const urls = normalizeUrlList(
    detail?.artistOrTeamsURL ||
    detail?.artistsOrTeamsURL ||
    detail?.artistOrTeamsUrl ||
    detail?.artistTeamUrls ||
    detail?.artistUrls ||
    detail?.attractionUrls
  );

  if (!names.length) {
    modalArtists.textContent = formatPipeSeparated(rawNames);
    return;
  }

  modalArtists.innerHTML = '';
  names.forEach((name, index) => {
    if (index > 0) {
      modalArtists.appendChild(document.createTextNode(' | '));
    }

    const url = urls[index] || '';
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'text-blue-400 hover:text-blue-300 underline';
      link.textContent = name;
      link.setAttribute('aria-label', `${name} (opens in new tab)`);
      modalArtists.appendChild(link);
    } else {
      const span = document.createElement('span');
      span.textContent = name;
      modalArtists.appendChild(span);
    }
  });
}

function parseEventDateValue(event) {
  const date = event?.dates?.start?.localDate || event?.date || event?.datetime || event?.startDate || '';
  const time = event?.dates?.start?.localTime || event?.time || event?.startTime || '';

  if (!date && !time) return null;

  let candidate = '';
  if (date) {
    candidate = `${date}${time ? `T${time}` : 'T00:00:00'}`;
  } else {
    candidate = `1970-01-01T${time}`;
  }

  const parsed = Date.parse(candidate);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  const fallback = Date.parse(date || time);
  return Number.isNaN(fallback) ? null : fallback;
}

function getSortValue(event, key) {
  switch (key) {
    case 'date':
      return parseEventDateValue(event);
    case 'event': {
      const name = (event?.name || '').trim();
      return name || null;
    }
    case 'genre': {
      const genre = getEventGenre(event);
      return genre && genre !== 'N/A' ? genre : null;
    }
    case 'venue': {
      const venue = getEventVenue(event);
      return venue && venue !== 'N/A' ? venue : null;
    }
    default:
      return null;
  }
}

function compareEvents(a, b) {
  if (!currentSort.key) return 0;

  const directionMultiplier = currentSort.direction === 'asc' ? 1 : -1;
  const valueA = getSortValue(a, currentSort.key);
  const valueB = getSortValue(b, currentSort.key);

  if (valueA == null && valueB == null) return 0;
  if (valueA == null) return 1 * directionMultiplier;
  if (valueB == null) return -1 * directionMultiplier;

  if (typeof valueA === 'number' && typeof valueB === 'number') {
    if (valueA === valueB) return 0;
    return valueA < valueB ? -1 * directionMultiplier : 1 * directionMultiplier;
  }

  const comparison = collator.compare(valueA.toString(), valueB.toString());
  if (comparison === 0) return 0;
  return comparison * directionMultiplier;
}

function getSortedEvents() {
  if (!currentEvents.length || !currentSort.key) {
    return currentEvents.slice();
  }
  return currentEvents.slice().sort((a, b) => compareEvents(a, b));
}

function applySortAndRender() {
  if (!currentEvents.length) {
    renderEventsTable([]);
    return;
  }
  renderEventsTable(getSortedEvents());
}

function updateSortIndicators() {
  if (!sortButtons || !sortButtons.length) return;
  sortButtons.forEach(button => {
    const sortKey = button.dataset.sortKey;
    const indicator = button.querySelector('.sort-indicator');
    const isActive = currentSort.key === sortKey;
    const th = button.closest('th');

    button.classList.toggle('text-white', isActive);
    button.classList.toggle('text-gray-300', !isActive);
    if (indicator) {
      indicator.textContent = currentSort.direction === 'asc' ? '▲' : '▼';
      indicator.classList.toggle('opacity-0', !isActive);
      indicator.classList.toggle('opacity-100', isActive);
    }
    if (th) {
      th.setAttribute('aria-sort', isActive ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none');
    }
  });
}

function handleSortButtonClick(event) {
  const button = event.currentTarget;
  if (!button) return;
  const sortKey = button.dataset.sortKey;
  if (!sortKey || !currentEvents.length) return;

  if (currentSort.key === sortKey) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.key = sortKey;
    currentSort.direction = 'asc';
  }

  updateSortIndicators();
  applySortAndRender();
}

if (sortButtons.length) {
  sortButtons.forEach(button => {
    button.addEventListener('click', handleSortButtonClick);
  });
}

updateSortIndicators();

function applyTicketStatusStyle(rawStatus) {
  if (!modalTicketStatus) return;

  const normalized = (rawStatus ?? '').toString().trim();
  const statusKey = normalized.toUpperCase();
  console.log('Applying ticket status style:', { rawStatus, normalized, statusKey });
  const styleConfig = TICKET_STATUS_STYLES[statusKey] || TICKET_STATUS_DEFAULT;

  modalTicketStatus.classList.remove(...TICKET_STATUS_ALL_CLASSES);
  modalTicketStatus.classList.add(...styleConfig.classes);

  const displayText = normalized
    ? (styleConfig.label || normalized)
    : TICKET_STATUS_DEFAULT.label;
  modalTicketStatus.textContent = displayText;
}

function resolveSeatMapUrl(detail) {
  if (!detail) return '';
  if (typeof detail.seatMap === 'string' && detail.seatMap.trim()) {
    return detail.seatMap.trim();
  }
  if (detail.seatMap && typeof detail.seatMap === 'object') {
    return detail.seatMap.staticUrl || detail.seatMap.url || detail.seatMap.href || '';
  }
  if (typeof detail.seatmap === 'string' && detail.seatmap.trim()) {
    return detail.seatmap.trim();
  }
  if (detail.seatmap && typeof detail.seatmap === 'object') {
    return detail.seatmap.staticUrl || detail.seatmap.url || '';
  }
  return '';
}

function buildEventDetailURL(eventId) {
  const params= new URLSearchParams({ id: eventId });
  if (debugMode)
    return `${serverURL_Debug}/event?${params.toString()}`;
  else
    return `${googleCloudUrl}/event?${params.toString()}`;
}

function openEventCard(detail) {
  if (!eventCard) return;

  const title = detail?.name || detail?.eventName || detail?.title || 'Event Details';
  if (modalEventTitle) modalEventTitle.textContent = title;

  // Handle Artists/Teams field
  const artistsField = document.getElementById('artistsField');
  populateModalArtists(detail);
  const hasArtists = detail?.artistsOrTeams || detail?.artists || detail?.attractions;
  if (artistsField) {
    artistsField.style.display = hasArtists ? 'block' : 'none';
  }

  // Handle Date field
  const dateField = document.getElementById('dateField');
  const dateValue = detail?.date || detail?.dates?.start?.localDate;
  if (modalDate && dateField) {
    if (dateValue) {
      modalDate.textContent = dateValue;
      dateField.style.display = 'block';
    } else {
      dateField.style.display = 'none';
    }
  }

  // Handle Time field
  const timeField = document.getElementById('timeField');
  const timeValue = detail?.time || detail?.dates?.start?.localTime;
  if (modalTime && timeField) {
    if (timeValue) {
      modalTime.textContent = timeValue;
      timeField.style.display = 'block';
    } else {
      timeField.style.display = 'none';
    }
  }

  // Handle Venue field
  const venueField = document.getElementById('venueField');
  let venueValue = detail?.venue;
  if (!venueValue && detail?._embedded?.venues?.length) {
    venueValue = detail._embedded.venues[0]?.name;
  }
  if (!venueValue && Array.isArray(detail?.venues) && detail.venues.length) {
    venueValue = detail.venues[0]?.name;
  }
  if (modalVenue && venueField) {
    if (venueValue) {
      modalVenue.textContent = venueValue;
      venueField.style.display = 'block';
    } else {
      venueField.style.display = 'none';
    }
  }

  // Handle Genres field
  const genresField = document.getElementById('genresField');
  const genresValue = formatPipeSeparated(detail?.genres || detail?.classifications || detail?.segment);
  if (modalGenres && genresField) {
    if (genresValue && genresValue !== 'N/A') {
      modalGenres.textContent = genresValue;
      genresField.style.display = 'block';
    } else {
      genresField.style.display = 'none';
    }
  }

  // Handle Price Range field
  const priceRangeField = document.getElementById('priceRangeField');
  const priceValue = formatPriceRange(detail);
  if (modalPriceRange && priceRangeField) {
    if (priceValue && priceValue !== 'N/A') {
      modalPriceRange.textContent = priceValue;
      priceRangeField.style.display = 'block';
    } else {
      priceRangeField.style.display = 'none';
    }
  }

  // Handle Ticket Status field
  const ticketStatusField = document.getElementById('ticketStatusField');
  const ticketStatus = detail?.ticketStatus;
  console.log('Event ticket status:', ticketStatus);
  if (ticketStatusField) {
    if (ticketStatus && ticketStatus.trim() !== '') {
      applyTicketStatusStyle(ticketStatus);
      ticketStatusField.style.display = 'block';
    } else {
      ticketStatusField.style.display = 'none';
    }
  }

  // Handle Buy Link field
  const buyLinkField = document.getElementById('buyLinkField');
  if (modalBuyLink && buyLinkField) {
    const buyUrl = detail?.buyAt || detail?.url || detail?.purchaseLink;
    if (buyUrl) {
      modalBuyLink.href = buyUrl;
      modalBuyLink.textContent = 'Purchase Tickets';
      modalBuyLink.classList.remove('pointer-events-none', 'opacity-50');
      modalBuyLink.setAttribute('aria-disabled', 'false');
      modalBuyLink.setAttribute('tabindex', '0');
      buyLinkField.style.display = 'block';
    } else {
      buyLinkField.style.display = 'none';
    }
  }

  const seatMapUrl = resolveSeatMapUrl(detail);
  if (modalSeatMapWrapper && modalSeatMap) {
    if (seatMapUrl) {
      modalSeatMap.src = seatMapUrl;
      modalSeatMap.alt = `${title} seat map`;
      modalSeatMapWrapper.classList.remove('hidden');
    } else {
      modalSeatMap.src = 'about:blank';
      modalSeatMap.alt = 'Seat map not available';
      modalSeatMapWrapper.classList.add('hidden');
    }
  }

  eventCard.classList.remove('hidden');
  
  // Scroll to the card
  setTimeout(() => {
    eventCard.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  }, 100);

  // Reset to event view when opening
  if (modalEventContent && modalVenueContent) {
    // Ensure event content visible, venue content hidden until user reveals
    modalEventContent.classList.remove('hidden');
    modalVenueContent.classList.add('hidden');
    if (venueToggleIcon) venueToggleIcon.textContent = '▼';
    if (venueToggleText) venueToggleText.textContent = 'Show Venue Details';
    if (venueRevealBar) venueRevealBar.classList.remove('hidden');
  }

  // Extract venue information for venue view
  // currentVenueData = extractVenueInfo(detail);

  //console.log('Extracted venue info:', currentVenueData);
  fetchVenueDetails(venueValue);
}

function buildVenueDetailURL(keyword) { 
    const params= new URLSearchParams({ keyword: keyword });
    if (debugMode)
      return `${serverURL_Debug}/venue?${params.toString()}`;
    else
      return `${googleCloudUrl}/venue?${params.toString()}`;

}

function fetchVenueDetails(keyword) {
    if (!keyword) {
        console.warn('Missing keyword for venue detail fetch');
        return;
    }
    const detailUrl = buildVenueDetailURL(keyword);
    console.log('Fetching venue details:', detailUrl);
    fetch(detailUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'

        }           
    })
    .then(res => {
        if (!res.ok) throw new Error(`Venue Detail HTTP ${res.status}`);
        return res.json();
    })
    .then(detail => {
        console.log('Venue detail loaded:', detail);
        populateVenueDetails(detail);
    })
    .catch(err => {
        console.error('Failed to fetch venue detail:', err);
        alert('Unable to load venue details. Please try again.');
    });
}           



function closeEventCard() {
  if (!eventCard || eventCard.classList.contains('hidden')) return;
  eventCard.classList.add('hidden');
  if (modalSeatMap) {
    modalSeatMap.src = 'about:blank';
  }
  applyTicketStatusStyle('');
}

function fetchEventDetails(eventId) {
  if (!eventId) {
    console.warn('Missing event id for detail fetch');
    return;
  }

  const detailUrl = buildEventDetailURL(eventId);
  console.log('Fetching event details:', detailUrl);

  fetch(detailUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  })
    .then(res => {
      if (!res.ok) throw new Error(`Detail HTTP ${res.status}`);
      return res.json();
    })
    .then(detail => {
      console.log('Event detail loaded:', detail);
      const cardData = detail?.event || detail?.data || detail;
      openEventCard(cardData);
    })
    .catch(err => {
      console.error('Failed to fetch event detail:', err);
      alert('Unable to load event details. Please try again.');
    });
}

function populateVenueDetails(venueData) {
  //if (!venueData) return;
  console.log('Populating venue details:', venueData);
  if (venueDetailName) venueDetailName.textContent = venueData.name;
  if (venueDetailLocation) {
    // Format address as: address, city, state postalCode
    const addressParts = [
      venueData.address,
      venueData.city,
      venueData.state,
      venueData.postalCode
    ].filter(Boolean); // Remove any undefined/null parts
    
    venueDetailLocation.textContent = addressParts.join(', ');
  }
  if (venueGoogleMapLink) {
    venueGoogleMapLink.href = venueData.googleMapUrl;
    venueGoogleMapLink.classList.toggle('pointer-events-none', !venueData.googleMapUrl);
  }
  if (venueMoreEventsLink) {
    venueMoreEventsLink.href = venueData.upcomingEventURL;
    venueMoreEventsLink.classList.toggle('pointer-events-none', !venueData.upcomingEventURL);
  }
}

if (venueToggleButton && modalVenueContent) {
  venueToggleButton.addEventListener('click', () => {
    // Reveal venue card, keep event content (decision: show both stacked) OR hide event? Spec says "a Venue details card should be displayed" and button disappears.
    // We'll keep event content and just add venue card below for context.
    modalVenueContent.classList.remove('hidden');
    if (venueRevealBar) venueRevealBar.classList.add('hidden');
    // Scroll smoothly to venue content
    setTimeout(() => {
      modalVenueContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  });
}

function renderEventsTable(events) {
  if (!resultsBody || !resultsTableWrapper || !noResultsMessage) {
    console.warn('Results table elements not found in DOM.');
    return;
  }

  if (!events || !events.length) {
    resultsBody.innerHTML = '';
    resultsTableWrapper.classList.add('hidden');
    return;
  }

  const fragment = document.createDocumentFragment();
  events.forEach(event => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-800/60 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-900';
    row.id = event.id;
    row.tabIndex = 0;
    row.setAttribute('role', 'button');

    const handleRowActivation = () => fetchEventDetails(event?.id);
    row.addEventListener('click', handleRowActivation);
    row.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        handleRowActivation();
      }
    });

    const dateCell = document.createElement('td');
    dateCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-200';
    const { date, time } = getEventDateParts(event);
    if (!date && !time) {
      dateCell.textContent = 'N/A';
    } else {
      if (date) {
        const dateLine = document.createElement('div');
        dateLine.textContent = date;
        dateLine.className = 'font-semibold';
        dateCell.appendChild(dateLine);
      }
      if (time) {
        const timeLine = document.createElement('div');
        timeLine.textContent = time;
        timeLine.className = 'text-xs text-gray-400';
        dateCell.appendChild(timeLine);
      }
    }
    row.appendChild(dateCell);

    const iconCell = document.createElement('td');
    iconCell.className = 'px-6 py-4 text-sm';
    const iconUrl = getEventIcon(event);
    if (iconUrl) {
      const img = document.createElement('img');
      img.src = iconUrl;
      img.alt = event?.name ? `${event.name} poster` : 'Event poster';
      img.className = 'h-30 w-40 rounded object-cover border border-gray-700';
      iconCell.appendChild(img);
    } else {
      iconCell.textContent = '—';
      iconCell.classList.add('text-gray-400');
    }
    row.appendChild(iconCell);

    const nameCell = document.createElement('td');
    nameCell.className = 'px-6 py-4 text-sm font-semibold text-white';
    nameCell.textContent = event?.name || 'Untitled event';
    row.appendChild(nameCell);

    const genreCell = document.createElement('td');
    genreCell.className = 'px-6 py-4 text-sm text-gray-300';
    genreCell.textContent = getEventGenre(event);
    row.appendChild(genreCell);

    const venueCell = document.createElement('td');
    venueCell.className = 'px-6 py-4 text-sm text-gray-300';
    venueCell.textContent = getEventVenue(event);
    row.appendChild(venueCell);

    fragment.appendChild(row);
  });

  resultsBody.innerHTML = '';
  resultsBody.appendChild(fragment);
  noResultsMessage.classList.add('hidden');
  resultsTableWrapper.classList.remove('hidden');
}

function renderResults(payload) {
  const events = normalizeEvents(payload);
  currentEvents = Array.isArray(events) ? events.slice() : [];

  if (!currentEvents.length) {
    showNoResults();
    currentSort = { key: null, direction: 'asc' };
    updateSortIndicators();
    return;
  }

  currentSort = { key: null, direction: 'asc' };
  updateSortIndicators();
  applySortAndRender();
}

if (modalCloseButton) {
  modalCloseButton.addEventListener('click', closeEventCard);
}
document.addEventListener('keydown', (evt) => {
  if (evt.key === 'Escape' && eventCard && !eventCard.classList.contains('hidden')) {
    closeEventCard();
  }
});

applyTicketStatusStyle('');

//Submit button
document.getElementById("inputform")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    resetResultsDisplay();
    const keyword = document.getElementById("keyword").value.trim();
    const distance = document.getElementById("distance").value.trim();
    const category = document.getElementById("category").value.trim();
    const location = document.getElementById("location").value.trim();
    console.log({ keyword, distance, category, location });
    if (!keyword && !location) {
      alert("Please enter a keyword and location");
      return;
    }
    if (!keyword) {
      alert("Please enter a keyword");
      return;
    }
    if (!location) {
      alert("Please enter a location");
      return;
    }

    const params = new URLSearchParams({
      keyword,
      distance,
      category,
      location    
    });

    if (autoDetectCheckbox && autoDetectCheckbox.checked) {
      params.append('autoDetect', 'true');
    }
    let url = '';
    if (debugMode)
      url = `${serverURL_Debug}/submit?${params.toString()}`;
    else
      url = `${googleCloudUrl}/submit?${params.toString()}`;
    console.log('GET URL:', url);

    fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Success', data);
        renderResults(data);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        showNoResults('Failed to fetch events.');
        alert('Error fetching results. Check console.');
      });
  });


// Clear button 
const clearBtn = document.getElementById("clear");
clearBtn.addEventListener("click", function (e) {
    e.preventDefault();
    const form = document.getElementById("inputform");
    if (!form) return;
    form.reset();
    resetResultsDisplay();

    if (autoDetectCheckbox) {
      autoDetectCheckbox.checked = false;
    }
    if (toggleLocationHandler) {
      toggleLocationHandler();
    } else if (locationInput) {
      locationInput.hidden = false;
    }

    console.log("Form cleared (reset to default values)");
});

// Toggle location input based on Auto-Detect checkbox
if (autoDetectCheckbox && locationInput) {
    toggleLocationHandler = () => {
    const on = autoDetectCheckbox.checked;
        if (on) {
            locationInput.hidden = true;
            locationInput.value = ""; // blank when auto-detecting
            getLocationByIP().then(loc => {
                locationInput.value = loc;
            }).catch(err => {
                console.error("Error fetching location:", err);
                locationInput.value = "Error fetching location";
            });
        } else {
            locationInput.hidden = false;
            locationInput.value = ""; // blank when manual input
        }
    };
  autoDetectCheckbox.addEventListener("change", toggleLocationHandler);
    // initialize state on load
    toggleLocationHandler();
}

const ipinfo_url_with_token = "https://ipinfo.io/?token=d8eeb3713deeb3";
async function getLocationByIP() {
    const response = await fetch(ipinfo_url_with_token);
    if (!response.ok) {
        throw new Error("Network response was not ok");
    }
    const json = await response.json();
    console.log("IP Info:", json);
    return json.loc;
}