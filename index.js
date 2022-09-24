const { program } = require('commander');
const { Client } = require('tplink-smarthome-api');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

program
    .option("-c, --config <path>", "Path to the configuration file", "./config.yaml")
    .option("--dry-run", "Don't actually perform any actions");

program
    .command("provision")
    .description("Provision one or all dimmers")
    .option("-i, --ip <host>", "Only provision one dimmer")
    .action(async (cmdOpts) => {
        const programOpts = program.opts();
        const file = fs.readFileSync(path.resolve(__dirname, programOpts.config), 'utf8');
        const config = yaml.load(file);

        /**
         * @type DeviceConfig[]
         */
        let devices = config.devices;

        if (cmdOpts.ip !== undefined) devices = devices.filter(x => x.host == cmdOpts.ip);
        
        for (let device of devices) {
            const client = new Client();
            const kasaDevice = await client.getDevice({ host: device.host });

            console.log(`Processing ${device.host}`);
            
            // Set alias
            const truncatedMac = kasaDevice.macNormalized.slice(-4);
            const alias = device.name.replace(' ', '_') + '_' + truncatedMac;
            console.log(`- Setting alias: ${alias}`);
            if (!programOpts.dryRun) {
                await kasaDevice.setAlias(alias);
            }

            // Configure indicator light
            console.log(`- Setting indicator light: ${device.indicatorLed ? 'on' : 'off'}`);
            if (!programOpts.dryRun) {
                await kasaDevice.setLedState(device.indicatorLed);
            }

            // Set default transitions
            console.log(`- Configuring transitions: ${device.drivesLedLights ? 'LED Bulbs' : 'Non-LED Bulbs'}`);
            
            const dimmer = kasaDevice.dimmer;
            if (!dimmer) throw new Error(`${device.host} does not have a dimmer!`)

            if (!programOpts.dryRun) {
                // Default is 1000
                dimmer.setFadeOffTime((device.drivesLedLights ? 500 : 1000));
                // Default is 1000
                dimmer.setFadeOnTime((device.drivesLedLights ? 50 : 1000));
            }
        }
    });

program
    .command("get-macs")
    .description("Get the MAC address of one or all dimmers")
    .option("-i, --ip <host>", "Only provision one dimmer")
    .action(async (cmdOpts) => {
        const programOpts = program.opts();
        const file = fs.readFileSync(path.resolve(__dirname, programOpts.config), 'utf8');
        const config = yaml.load(file);

        /**
         * @type DeviceConfig[]
         */
        let devices = config.devices;

        if (cmdOpts.ip !== undefined) devices = devices.filter(x => x.host == cmdOpts.ip);
        
        for (let device of devices) {
            const client = new Client();
            const kasaDevice = await client.getDevice({ host: device.host });
            
            console.log(`${device.host} - ${kasaDevice.mac}`);
        }
    });

program.parse();

/**
 * @typedef DeviceConfig
 * @property {string} host
 * @property {string} name
 * @property {boolean} indicatorLed
 * @property {boolean} drivesLedLights
 */
