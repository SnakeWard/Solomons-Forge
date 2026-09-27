"use strict";

// Programmatic entry point. The forge command (src/cli.js) wraps the same functions.
const { createReceipt, validateContract, markdown } = require("./receipt/acceptance");
const { bindContract, validateDraft } = require("./contract/bind");
const { main: validateHandoff } = require("./validate/handoff");

module.exports = { createReceipt, validateContract, markdown, bindContract, validateDraft, validateHandoff };
