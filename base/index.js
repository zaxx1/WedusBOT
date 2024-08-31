const colors = require('colors');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const readline = require('readline');

dayjs.extend(utc);
dayjs.extend(timezone);

const profile = new Map();
const currentAccount = new Map();
const currentProject = new Map();
const KEY_CURRENT_PROFILE = 'currentProfile';
const KEY_CURRENT_PROJECT = 'currentProject';
const FORMAT_DATE_TIME = 'DD/MM/YYYY HH:mm';

const headers = {
  authority: '',
  'Content-Type': 'application/json',
  Origin: '',
  scheme: 'https',
  Priority: 'u=1, i',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': 'Windows',
  'Sec-Fetch-Dest': ' empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
};

async function errors(message) {
  const { username } = await getCurrentProfile(KEY_CURRENT_PROFILE);
  const project = await getCurrentProject(KEY_CURRENT_PROFILE);
  const projectGoats = project && typeof project.goats === 'string' ? project.goats() : 'UNKNOWN PROJECT';
  console.log(
    colors.red(
      `[ ${projectGoats()}${username ? ' - ' + username : ''} ]`,
    ),
    colors.red(message),
  );
}

function toIndonesiaTime(timeUtc) {
  const IndonesiaTime = dayjs.utc(timeUtc).tz('Asia/Jakarta');
  const formattedIndonesiaTime = indonesiaTime.format(FORMAT_DATE_TIME);
  return formattedIndonesiaTime;
}

async function logs(message) {
  const { username } = await getCurrentProfile(KEY_CURRENT_PROFILE);
  const project = await getCurrentProject(KEY_CURRENT_PROFILE);
  const projectGoats = project && typeof project.goats === 'string' ? project.goats() : 'UNKNOWN PROJECT';
  console.log(
    colors.cyan(
      `[ ${projectGoats}${username ? ' - ' + username : ''} ]`,
    ),
    colors.green(message),
  );
} catch (error) 
  {console.error("Error occured in logs function:", error.message);} 
}
const formatNumber = (point = 0) => {
  return new Intl.NumberFormat('us-US').format(point);
};

async function setCurrentProfile(data) {
  currentAccount.set(KEY_CURRENT_PROFILE, data);
}

async function getCurrentProfile() {
  return currentAccount.get(KEY_CURRENT_PROFILE);
}

async function setCurrentProject(data) {
  currentProject.set(KEY_CURRENT_PROJECT, data);
}

async function getCurrentProject() {
  return currentProject.get(KEY_CURRENT_PROJECT);
}

async function getProfile() {
  return profile;
}

async function getHeader({
  isQueryId = false,
  url,
  method,
  customHeader,
  tokenType,
  typeQueryId = 'tma ',
}) {
  const splitUrl = url.split('/');
  const domain = [...splitUrl].slice(0, 3).join('/');
  const path = '/' + [...splitUrl].slice(3, splitUrl.length).join('/');

  const authDomain = {
    Origin: domain,
    authority: domain,
    path: path,
    method: method,
  };
  const { query_id, token } = await getCurrentProfile();
  if (isQueryId) {
    return {
      ...headers,
      ...authDomain,
      ...(typeQueryId === 'raw'
        ? { rawdata: query_id }
        : {
            Authorization: typeQueryId + query_id,
          }),

      ...customHeader,
    };
  }
  return {
    ...headers,
    ...authDomain,
    Authorization:
      tokenType === 'Bearer' ? 'Bearer ' + token : tokenType + token,
    ...customHeader,
  };
}

async function callApi({
  url,
  method,
  body = {},
  isQueryId = false,
  headersCustom = {},
  isAuth = true,
  typeQueryId,
  tokenType = 'Bearer',
}) {
  try {
    const genHeaders = await getHeader({
      isQueryId,
      url,
      method,
      headersCustom,
      tokenType,
      typeQueryId,
    });

    if (!isAuth) {
      delete genHeaders.Authorization;
      delete genHeaders.rawdata;
    }

    if (isQueryId) {
      typeQueryId === 'raw'
        ? delete genHeaders.Authorization
        : delete genHeaders.rawdata;
    }
    const res = await fetch(url, {
      method: method,
      headers: genHeaders,
      ...(method !== 'GET' && { body: JSON.stringify(body) }),
    });
    const response = await res.json();

    if (
      !response ||
      (response?.statusCode &&
        (response?.statusCode === 500 || response?.statusCode === 401))
    ) {
      errors(
        'Lấy lại query_id hoặc token !:' + url + `[ ${response?.message} ]`,
      );
      return response;
    }
    return response;
  } catch (error) {
    // errors(error);
  }
}

function extractUserData(queryId) {
  const isUseDecode = queryId.startsWith('user=');
  const decodedString = decodeURIComponent(queryId);
  const params = new URLSearchParams(decodedString);
  const user = JSON.parse(params.get('user'));
  const query_id_decode = params.get('query_id');
  const auth_date = params.get('auth_date');
  const chat_instance = params.get('chat_instance');
  const start_param = params.get('start_param');
  const hash = params.get('hash');
  const chat_type = params.get('chat_type');

  return {
    userId: user.id,
    username: user.username,
    user: user,
    query_id: isUseDecode ? queryId : decodedString,
    token: '',
    auth_date: auth_date,
    chat_instance: chat_instance,
    start_param: start_param,
    hash: hash,
    chat_type: chat_type,
    query_id_decode: query_id_decode,
    isUseDecode: isUseDecode,
  };
}

async function loadConfig(nameFile) {
  return new Promise((res, rej) => {
    parentDir = path.join(__dirname, '..');
    fs.readFile(
      path.resolve(parentDir, nameFile),
      'utf-8',
      async (err, data) => {
        if (err) {
          rej(err);
        }

        const d = JSON.parse(data);
        for (const item in d) {
          const convertQueryId = d[item]?.map((e) => {
            const hasQueryId = Object.keys(e).includes('query_id');
            if (hasQueryId) {
              return extractUserData(e['query_id']);
            }
            return e;
          });
          profile.set(item, convertQueryId);
        }

        await delay(2);
        res(d);
      },
    );
  });
}

function loadProfileTxt(pathFile) {
  try {
    const dataFile = path.join(pathFile, 'data.txt');
    const v = fs
      .readFileSync(dataFile, 'utf8')
      .replace(/\r/g, '')
      .split('\n')
      .filter(Boolean);

    const dataExtract = [];
    if (v.length) {
      for (let a of v) {
        const data = extractUserData(a);
        dataExtract.push(data);
      }
      console.log(
        colors.green(`Load thành công ${colors.yellow(v.length)} profile !`),
      );
    } else
      console.log(colors.red('Không tìm thấy thông tin nào trong data.txt'));
    return dataExtract;
  } catch (e) {
    console.log(colors.red('Không thể load profile: ', e));
  }
}

async function delay(second, show) {
  if (show) {
    for (let i = second; i >= 0; i--) {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        `${colors.dim('[ WAITING ]')} Chờ ${colors.cyan(
          i + 's',
        )} để tiếp tục vòng lặp !`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

function profileSumary() {
  profile.forEach((v, k) => {
    let key = k;

    console.log(`[ ${key} ]`.cyan, colors.green(v.length), 'profiles');
  });
}

function randomBetweenNumber(min = 0, max) {
  if (!max) return 5;
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const publicModules = {
  loadConfig,
  profileSumary,
  logs,
  errors,
  getCurrentProfile,
  getProfile,
  setCurrentProfile,
  profile,
  currentAccount,
  callApi,
  getHeader,
  delay,
  setCurrentProject,
  getCurrentProject,
  toIndonesiaTime,
  FORMAT_DATE_TIME,
  formatNumber,
  randomBetweenNumber,
  loadProfileTxt,
};

module.exports = publicModules;
