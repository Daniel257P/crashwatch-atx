// Austin Open Data API Endpoints and functions
const TRAFFIC_INCIDENTS_URL =
  'https://data.austintexas.gov/resource/dx9v-zd7x.json';

const CRASH_RECORDS_URL =
  'https://data.austintexas.gov/resource/y2wy-tgr5.json';

//Traffic Incidents
export async function fetchTrafficIncidents() {
  try {
    const response = await fetch(
      `${TRAFFIC_INCIDENTS_URL}?$limit=200&$order=published_date DESC`
    );

    if (!response.ok) {
      throw new Error(`Traffic incidents fetch failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Traffic incidents loaded: ${data.length} records`);
    return data;

  } catch (error) {
    console.error('fetchTrafficIncidents error:', error);
    return [];
  }
}

//Crash Records
export async function fetchCrashRecords() {
  try {
    const response = await fetch(
      `${CRASH_RECORDS_URL}?$limit=200&$order=crash_timestamp DESC`
    );

    if (!response.ok) {
      throw new Error(`Crash records fetch failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Crash records loaded: ${data.length} records`);
    return data;

  } catch (error) {
    console.error('fetchCrashRecords error:', error);
    return [];
  }
}

//Traffic Incident
export function normalizeIncident(raw) {
  const label = raw.issue_reported || '';
  const upper = label.toUpperCase();

  let severity = 'other';
  if (
    upper.includes('COLLISION') ||
    upper.includes('COLLISN')   ||
    upper.includes('CRASH')     ||
    upper.includes('FLEET ACC')
  ) {
    severity = 'crash';
  } else if (
    upper.includes('HAZARD') ||
    upper.includes('HAZD')   ||
    upper.includes('LIVESTOCK')
  ) {
    severity = 'hazard';
  }

  return {
    id:        raw.traffic_report_id || 'unknown',
    type:      label || 'Unknown',
    address:   raw.address || 'Unknown location',
    lat:       parseFloat(raw.latitude)  || null,
    lng:       parseFloat(raw.longitude) || null,
    status:    raw.traffic_report_status || 'unknown',
    published: raw.published_date || null,
    updated:   raw.traffic_report_status_date_time || null,
    agency:    raw.agency || null,
    severity:  severity,
    source:    'traffic'
  };
}


//Crash Record
export function normalizeCrash(raw) {
  const sevId = parseInt(raw.crash_sev_id);
  const severity = (sevId >= 1 && sevId <= 3) ? 'crash' : 'other';

  return {
    id:         raw.case_id || raw.id || 'unknown',
    type:       raw.collsn_desc || 'Unknown',
    address:    raw.address_display || 'Unknown location',
    lat:        parseFloat(raw.latitude)  || null,
    lng:        parseFloat(raw.longitude) || null,
    date:       raw.crash_timestamp || null,
    severity:   severity,
    deaths:     parseInt(raw.death_cnt) || 0,
    injuries:   parseInt(raw.tot_injry_cnt) || 0,
    fatalFlag:  raw.crash_fatal_fl === true || raw.crash_fatal_fl === 'true',
    units:      raw.units_involved || null,
    speedLimit: raw.crash_speed_limit || null,
    source:     'crash'
  };
}