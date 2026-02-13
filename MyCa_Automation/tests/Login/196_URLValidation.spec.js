#!/usr/bin/env node
//This is the test case to vverify whether URL is working in broswer.
const http = require('http');
const { exec } = require('child_process');

const URL = 'http://localhost:3000/login';

function openBrowser(u) {
	const platform = process.platform;
	let cmd;
	if (platform === 'win32') cmd = `start "" "${u}"`;
	else if (platform === 'darwin') cmd = `open "${u}"`;
	else cmd = `xdg-open "${u}"`;

	exec(cmd, (err) => {
		if (err) console.error('Failed to open browser:', err.message || err);
		else console.log('Opened browser to', u);
	});
}

function checkUrl(u, timeout = 10000) {
	const req = http.get(u, (res) => {
		console.log(`HTTP ${res.statusCode} ${res.statusMessage}`);
		if (res.statusCode === 200) {
			console.log('✅ URL is reachable (200 OK).');
			process.exit(0);
		} else {
			console.error('⚠️ URL returned non-200 status.');
			process.exit(2);
		}
	});

	req.on('error', (err) => {
		console.error('Request error:', err.message || err);
		process.exit(1);
	});

	req.setTimeout(timeout, () => {
		req.abort();
		console.error('Request timed out');
		process.exit(3);
	});
}

// Main
console.log('Opening URL in browser and checking HTTP status:', URL);
openBrowser(URL);
checkUrl(URL);
