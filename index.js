const {
  errors,
  logs,
  callApi,
  getCurrentProfile,
  setCurrentProfile,
  delay,
} = require('../../src');
const colors = require('colors');
const readline = require('readline');
const ID_QUEST_NOT_AUTO = [];

async function getInfo(isAll = true) {
  const url = 'https://dev-api.goatsbot.xyz/users/me';

  const res = await callApi({
    url: url,
    method: 'GET',
  });

  if (!res) return;

  const {
    age,
    balance,
    balance_age,
    balance_ref,
    balance_premium,
    is_premium,
    address,
    username,
  } = res;

  if (res?.statusCode === 401) {
    errors('Token Kadaluwarsa !');
    return;
  }

  if (username) {
    const currentUser = await getCurrentProfile();
    const dataUsername = {
      ...currentUser,
      username: username,
    };
    await setCurrentProfile(dataUsername);
  }
  if (isAll) {
    logs(`Telegram ${colors.yellow(age)} usia`);
    logs(`Saldo berdasarkan usia tele mu: ${colors.yellow(balance_age)}`);
    logs(`Saldo reff: ${colors.yellow(balance_ref)}`);
    if (is_premium) {
      logs(`Balance Premium: ${colors.zebra(balance_premium)}`);
    }
    logs(`${address ? 'Sudah terhubung ke wallet' : colors.red('Belum terhubung ke wallet')}`);
  }
  logs(`Total saldo: ${colors.cyan(balance)}`);
  return true;
}

async function refreshToken() {
  try {
    const data = await getCurrentProfile();
    const { refreshToken: tokenRefreshData } = data;
    const url = 'https://dev-api.goatsbot.xyz/auth/refresh-tokens';
    const res = await callApi({
      url: url,
      method: 'POST',
      body: {
        refreshToken: tokenRefreshData,
      },
    });

    if (!res) {
      errors('Token error !');
      return;
    }
    const {
      tokens: {
        access: { token: accessToken },
        refresh: { token: tokenRefresh },
      },
    } = res;

    await setCurrentProfile({
      ...data,
      token: accessToken,
      refreshToken: tokenRefresh,
    });

    logs(`Token berhasil !`);
    await login()
    return res;
  } catch (error) {}
}

async function doQuest() {
  const url = 'https://api-mission.goatsbot.xyz/missions/user';
  const res = await callApi({
    url: url,
    method: 'GET',
  });
  const listQuest = Object.values(res).flat(1);
  const listQuestUnFinish = listQuest.filter(
    (e) => !e.status && !ID_QUEST_NOT_AUTO.includes(e._id),
  );
  const listQuestUnAutoComplete = listQuest.filter(
    (e) => !e.status && ID_QUEST_NOT_AUTO.includes(e._id),
  );
  if (listQuestUnAutoComplete.length) {
    logs(
      colors.green(
        `Quest yg belum di garap secara manual: ${colors.yellow(
          listQuestUnAutoComplete.map((e) => e.name).join(', '),
        )}`,
      ),
    );
  }

  if (listQuestUnFinish.length) {
    logs(`Mulai mengerjakan ${colors.cyan(listQuestUnFinish.length)} quest...`.white);
  } else {
    logs('Semua quest selesai'.white);
    return;
  }

  const data = await getCurrentProfile();
  const { username } = data;
  for await (const task of listQuestUnFinish) {
    const { _id, name } = task;
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(
      `[ ${colors.magenta(`${username}`)} ]` +
        colors.yellow(` Quest : ${colors.white(name)} `) +
        colors.red('Đang làm... '),
    );
    await delay(2);
    const isFinish = await finishQuest(_id);
    readline.cursorTo(process.stdout, 0);
    if (isFinish) {
      process.stdout.write(
        `[ ${colors.magenta(`${username}`)} ]` +
          colors.yellow(` Quest : ${colors.white(name)} `) +
          colors.green('Done !                  '),
      );
    } else {
      process.stdout.write(
        `[ ${colors.magenta(`${username}`)} ]` +
          colors.yellow(` Quest : ${colors.white(name)} `) +
          colors.red('Faild !                  '),
      );
    }
    console.log();
  }
  logs('Semua quest telah digarap !');
  return true;
}

async function finishQuest(id) {
  try {
    const url = 'https://dev-api.goatsbot.xyz/missions/action/' + id;
    const res = await callApi({
      url: url,
      method: 'POST',
    });
    const { status } = res;
    return status === 'success';
  } catch (error) {
    return;
  }
}

async function dailyCheckin() {
  try {
    const url =
      'https://api-checkin.goatsbot.xyz/checkin/action/66cc7580df664984e4617ce0';
    const res = await callApi({
      url: url,
      method: 'POST',
    });

    const isCheckinSuccess = res?.status === 'success';
    if (isCheckinSuccess) {
      logs('Check-in sukses bree!');
    } else {
      logs(colors.white('Hari ini sudah Check-in !'));
    }
    return isCheckinSuccess;
  } catch (error) {
    return;
  }
}

async function login() {
  try {
    const data = await getCurrentProfile();
    const url = 'https://dev-api.goatsbot.xyz/auth/login';
    const res = await callApi({
      url: url,
      method: 'POST',
      isQueryId: true,
      typeQueryId: 'raw',
    });

    if (!res) {
      errors('Login gagal, sedang mencoba login ulang !');
      await refreshToken();
      return
    }

    const {
      tokens: {
        access: { token: accessToken },
        refresh: { token: tokenRefresh },
      },
    } = res;

    await setCurrentProfile({
      ...data,
      token: accessToken,
      refreshToken: tokenRefresh,
    });

    logs('Login sukses !');
    return true;
  } catch (error) {
    errors('Login gagal, sedang mencoba login ulang !');
    await refreshToken();
  }
}

async function processAccount(type, account) {
  if (type !== 'goats') {
    return;
  }

  if (!account) {
    errors('', 'Akun tidak valid !');
    return;
  }

  logs(colors.yellow('GOATS start !'));
  const isAuth = await login();
  if (!isAuth) return;
  await getInfo();
  await dailyCheckin()
  const isReloadBalance = await doQuest();
  if (!isReloadBalance) return;
  await getInfo(false);
  try {
  } catch (e) {
    errors('', e);
  }
}

const exportModules = {
  processAccount,
};

module.exports = exportModules;


(async function main() {
  console.log();
  await loadConfig('data.json');
  profileSumary();
  await startSession();
})();
