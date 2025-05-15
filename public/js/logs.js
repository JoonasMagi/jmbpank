// Logs Module - Handles logs viewing functionality
const Logs = (() => {
  // Store logs
  let logEntries = [];
  let currentLogFile = '';
  let availableLogFiles = [];

  // Load logs from API
  const loadLogs = async (lines = 100) => {
    if (!Auth.isAuthenticated()) {
      return;
    }

    try {
      const logsContainer = document.getElementById('logs-container');
      if (!logsContainer) return;

      logsContainer.innerHTML = '<div class="loading">Loading logs...</div>';

      const response = await fetch(`/api/logs?lines=${lines}`, {
        headers: {
          Authorization: `Bearer ${Auth.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load logs');
      }

      const data = await response.json();
      logEntries = data.logs;
      currentLogFile = data.file;
      availableLogFiles = data.available_files || [];

      renderLogs();
      return data;
    } catch (error) {
      console.error('Error loading logs:', error);
      const logsContainer = document.getElementById('logs-container');
      if (logsContainer) {
        logsContainer.innerHTML = `<div class="error-message">Error loading logs: ${error.message}</div>`;
      }
      return { logs: [] };
    }
  };

  // Load specific log file
  const loadLogFile = async (filename, lines = 100) => {
    if (!Auth.isAuthenticated()) {
      return;
    }

    try {
      const logsContainer = document.getElementById('logs-container');
      if (!logsContainer) return;

      logsContainer.innerHTML = '<div class="loading">Loading log file...</div>';

      const response = await fetch(`/api/logs/${filename}?lines=${lines}`, {
        headers: {
          Authorization: `Bearer ${Auth.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load log file');
      }

      const data = await response.json();
      logEntries = data.logs;
      currentLogFile = data.file;

      renderLogs();
      return data;
    } catch (error) {
      console.error('Error loading log file:', error);
      const logsContainer = document.getElementById('logs-container');
      if (logsContainer) {
        logsContainer.innerHTML = `<div class="error-message">Error loading log file: ${error.message}</div>`;
      }
      return { logs: [] };
    }
  };

  // Render logs to the DOM
  const renderLogs = () => {
    const logsContainer = document.getElementById('logs-container');
    if (!logsContainer) return;

    const logFiles = document.getElementById('log-files');
    if (logFiles && availableLogFiles.length > 0) {
      logFiles.innerHTML = '';

      // Add file selector
      const fileSelector = document.createElement('select');
      fileSelector.id = 'log-file-selector';
      fileSelector.className = 'log-file-selector';

      availableLogFiles.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        option.selected = file === currentLogFile;
        fileSelector.appendChild(option);
      });

      fileSelector.addEventListener('change', () => {
        loadLogFile(fileSelector.value);
      });

      logFiles.appendChild(fileSelector);
    }

    if (logEntries.length === 0) {
      logsContainer.innerHTML = '<div class="loading">No logs found.</div>';
      return;
    }

    // Create log content
    logsContainer.innerHTML = '';

    const logDisplay = document.createElement('div');
    logDisplay.className = 'log-display';

    const pre = document.createElement('pre');
    pre.className = 'logs-content';

    // Add each log line with line numbers
    logEntries.forEach((log, index) => {
      const line = document.createElement('div');
      line.className = 'log-line';

      const lineNumber = document.createElement('span');
      lineNumber.className = 'line-number';
      lineNumber.textContent = index + 1;

      const lineContent = document.createElement('span');
      lineContent.className = 'line-content';

      // Apply syntax highlighting based on log level
      if (log.includes(' ERROR ') || log.includes(' Error ')) {
        lineContent.classList.add('error-log');
      } else if (log.includes(' WARN ') || log.includes(' Warning ')) {
        lineContent.classList.add('warn-log');
      } else if (log.includes(' INFO ') || log.includes(' Information ')) {
        lineContent.classList.add('info-log');
      }

      lineContent.textContent = log;

      line.appendChild(lineNumber);
      line.appendChild(lineContent);
      pre.appendChild(line);
    });

    logDisplay.appendChild(pre);
    logsContainer.appendChild(logDisplay);

    // Add log controls
    const logControls = document.createElement('div');
    logControls.className = 'log-controls';

    const refreshButton = document.createElement('button');
    refreshButton.className = 'btn secondary';
    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
    refreshButton.addEventListener('click', () => {
      if (currentLogFile) {
        loadLogFile(currentLogFile);
      } else {
        loadLogs();
      }
    });

    const lineCountSelect = document.createElement('select');
    lineCountSelect.className = 'line-count-select';
    [50, 100, 200, 500, 1000].forEach(count => {
      const option = document.createElement('option');
      option.value = count;
      option.textContent = `${count} lines`;
      option.selected = count === 100;
      lineCountSelect.appendChild(option);
    });

    lineCountSelect.addEventListener('change', () => {
      if (currentLogFile) {
        loadLogFile(currentLogFile, parseInt(lineCountSelect.value));
      } else {
        loadLogs(parseInt(lineCountSelect.value));
      }
    });

    logControls.appendChild(refreshButton);
    logControls.appendChild(document.createTextNode(' Show: '));
    logControls.appendChild(lineCountSelect);

    logsContainer.appendChild(logControls);
  };

  // Toggle logs panel visibility
  const toggleLogsPanel = () => {
    const logsPanel = document.getElementById('logs-panel');
    if (!logsPanel) return;

    if (logsPanel.classList.contains('hidden')) {
      logsPanel.classList.remove('hidden');
      loadLogs();
    } else {
      logsPanel.classList.add('hidden');
    }
  };

  // Setup event listeners
  const setupEventListeners = () => {
    // Logs button in header
    const logsBtn = document.getElementById('logs-btn');
    if (logsBtn) {
      logsBtn.addEventListener('click', toggleLogsPanel);
    }

    // Close logs panel button
    const closeLogsBtn = document.getElementById('close-logs-btn');
    if (closeLogsBtn) {
      closeLogsBtn.addEventListener('click', toggleLogsPanel);
    }
  };

  // Initialize module
  const initialize = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupEventListeners);
    } else {
      setupEventListeners();
    }
  };

  // Return public methods
  return {
    initialize,
    loadLogs,
    loadLogFile,
    toggleLogsPanel,
  };
})();

// Initialize the logs module
Logs.initialize();
