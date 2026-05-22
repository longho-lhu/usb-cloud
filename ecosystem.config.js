module.exports = {
    apps: [
        {
            name: 'usb',
            cwd: __dirname,
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 3014',
            env: {
                NODE_ENV: 'production',
            }
        }
    ]
};