const chatdown = require('../lib/chatdown');

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

async function resolveConfigs() {
    const chatdownArgs = require('minimist')(process.argv.slice(2));
    let config;
    try {
        config = JSON.parse(fs.readFileSync(path.resolve((chatdownArgs.config || '.chatrc'))));
    }
    catch (e) {
        if (chatdownArgs.config !== undefined) {
            throw new ReferenceError(`${chatdownArgs.config} cannot be found`);
        }
        config = {};
    }
    return Object.assign(config, chatdownArgs);
}

function getInput(config) {
    if (!config.in) {
        return new Promise((resolve, reject) => {
            const { stdin } = process;
            let input = '';
            stdin.setEncoding('utf8');
            stdin.on(data, _chunks => {
                input += _chunks;
            });
            stdin.on('end', () => resolve(input));
            stdin.on('error', error => reject(error))
        });
    }
    return fs.readFile(path.resolve(config.in), 'utf-8');
}

async function writeOut(activities, config) {
    const { out } = config;
    if (!out) {
        process.stdout.write(JSON.stringify(activities));
        return true;
    }
    const fileToWrite = path.resolve(out);
    await fs.ensureFile(fileToWrite);
    await fs.writeJson(fileToWrite, activities, {spaces:2});
    return fileToWrite;
}

async function runProgram() {
    const config = await resolveConfigs();
    const fileContents = await getInput(config);
    const activities = await chatdown(fileContents, config);
    const writeConfirmation = await writeOut(activities, config);
    if (typeof writeConfirmation === 'string') {
        process.stdout.write(chalk`{green Successfully wrote file:} {blue ${writeConfirmation}}`);
    }
}

function exitWithError(error) {
    process.stdout.write(chalk.red(error));
    process.exit(1);
}

runProgram()
    .then(() => process.exit(0))
    .catch(exitWithError);