const {
  delay,
  profileSumary,
  profile,
  loadConfig,
  setCurrentProfile,
  setCurrentProject,
  errors,
} = require('./base');
const colors = require('colors');
const { processAccount: processGoats } = require('./modules/goats');
const CONSTANT = require('./constant');
let runTheFirst = true;

async function startSession() {
  for await (const project of profile.keys()) {
    console.log('');
    const isRunningAllow = CONSTANT.PROJECT_REPEAT.includes(project);
    if (!runTheFirst && !isRunningAllow) {
      errors(
        `Sudah diatur ${colors.cyan(
          project,
        )} Berhenti setelah mulai pertama kali !`,
      );
      return;
    }

    const listAccount = profile.get(project);

    if (!listAccount.length) return;

    for await (const account of listAccount) {
      await setCurrentProfile(account);
      switch (project) {
        case 'goats':
          await processGoats(project, account);
          break;
     }
      console.log('');
      console.log(
        '-------------------------------[ 💤💤💤 ]-------------------------------',
      );
      console.log('');
      await delay(2);
    }
  }
  runTheFirst = false;
  await delay(CONSTANT.TIME_REPEAT_AGAIN, true);
  console.log('');
  await startSession();
}

(async function main() {
  console.log();
  await loadConfig('data.json');
  profileSumary();
  await startSession();
})();
