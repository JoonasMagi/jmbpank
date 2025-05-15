// Logs Module - Handles HTTP request/response logging functionality
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

      logsContainer.innerHTML = '<div class="loading">Loading HTTP logs...</div>';

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

      renderHttpLogs();
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

      logsContainer.innerHTML = '<div class="loading">Loading HTTP logs...</div>';

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

      renderHttpLogs();
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

  // Render HTTP logs to the DOM
  const renderHttpLogs = () => {
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

    // Make sure logEntries is an array before filtering
    if (!Array.isArray(logEntries) || logEntries.length === 0) {
      logsContainer.innerHTML = '<div class="loading">No logs found. Try refreshing.</div>';
      return;
    }

    // Filter logs to only include HTTP requests and responses
    const httpLogs = logEntries.filter(log => {
      // Make sure log is a string before using includes
      if (typeof log !== 'string') return false;

      return (
        log.includes('REQUEST:') ||
        log.includes('RESPONSE:') ||
        log.includes('REQUEST BODY:') ||
        log.includes('RESPONSE ERROR:')
      );
    });

    if (httpLogs.length === 0) {
      logsContainer.innerHTML =
        '<div class="loading">No HTTP logs found. Try making some API requests.</div>';
      return;
    }

    // Create log content
    logsContainer.innerHTML = '';

    const logDisplay = document.createElement('div');
    logDisplay.className = 'log-display';

    const httpLogTable = document.createElement('table');
    httpLogTable.className = 'http-log-table';

    // Create table header
    const tableHeader = document.createElement('thead');
    tableHeader.innerHTML = `
      <tr>
        <th>Time</th>
        <th>Type</th>
        <th>Method</th>
        <th>URL</th>
        <th>Status</th>
        <th>Details</th>
      </tr>
    `;
    httpLogTable.appendChild(tableHeader);

    // Create table body
    const tableBody = document.createElement('tbody');

    // Group related logs (request and response)
    const logGroups = {};

    httpLogs.forEach(log => {
      const timestamp = log.match(/\[(.*?)\]/)?.[1] || '';
      const type = log.includes('REQUEST:')
        ? 'REQUEST'
        : log.includes('RESPONSE:')
          ? 'RESPONSE'
          : log.includes('REQUEST BODY:')
            ? 'REQUEST BODY'
            : 'RESPONSE ERROR';

      // Extract method and URL
      let method = '';
      let url = '';
      let status = '';
      let details = '';

      if (type === 'REQUEST' || type === 'RESPONSE') {
        const methodMatch = log.match(/(?:REQUEST|RESPONSE): (\w+) (.*?)( - |$)/);
        if (methodMatch) {
          method = methodMatch[1];
          url = methodMatch[2];
        }

        if (type === 'RESPONSE') {
          const statusMatch = log.match(/Status: (\d+)/);
          if (statusMatch) {
            status = statusMatch[1];
          }
        }
      } else if (type === 'REQUEST BODY' || type === 'RESPONSE ERROR') {
        // Extract the JSON body if present
        const bodyMatch = log.match(/(?:REQUEST BODY|RESPONSE ERROR): (.+)$/);
        if (bodyMatch) {
          details = bodyMatch[1];
        }
      }

      // Create a unique key for grouping related logs
      const urlKey = url.split('?')[0]; // Remove query params for grouping
      const timeKey = timestamp.split('.')[0]; // Remove milliseconds for grouping
      const groupKey = `${timeKey}-${method}-${urlKey}`;

      if (!logGroups[groupKey]) {
        logGroups[groupKey] = {
          timestamp,
          requests: [],
          responses: [],
        };
      }

      if (type === 'REQUEST' || type === 'REQUEST BODY') {
        logGroups[groupKey].requests.push({ type, method, url, details, raw: log });
      } else {
        logGroups[groupKey].responses.push({ type, method, url, status, details, raw: log });
      }
    });

    // Sort log groups by timestamp (newest first)
    const sortedGroups = Object.values(logGroups).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Add rows for each log group
    sortedGroups.forEach(group => {
      // Request row
      if (group.requests.length > 0) {
        const request = group.requests[0];
        const requestRow = document.createElement('tr');
        requestRow.className = 'request-row';

        const formattedTime = new Date(group.timestamp).toLocaleTimeString();

        requestRow.innerHTML = `
          <td>${formattedTime}</td>
          <td class="log-type request">REQUEST</td>
          <td>${request.method}</td>
          <td class="url">${request.url}</td>
          <td>-</td>
          <td>${group.requests.length > 1 ? 'Has body' : ''}</td>
        `;

        // Add click event to show details
        if (group.requests.length > 1) {
          requestRow.addEventListener('click', () => {
            // Find request body
            const bodyRequest = group.requests.find(r => r.type === 'REQUEST BODY');
            if (bodyRequest) {
              alert(`Request Body:\n${bodyRequest.details}`);
            }
          });
          requestRow.classList.add('has-details');
        }

        tableBody.appendChild(requestRow);
      }

      // Response row
      if (group.responses.length > 0) {
        const response = group.responses[0];
        const responseRow = document.createElement('tr');
        responseRow.className = 'response-row';

        // Add status color class
        let statusClass = '';
        if (response.status) {
          const statusNum = parseInt(response.status);
          if (statusNum >= 200 && statusNum < 300) statusClass = 'status-success';
          else if (statusNum >= 300 && statusNum < 400) statusClass = 'status-redirect';
          else if (statusNum >= 400 && statusNum < 500) statusClass = 'status-client-error';
          else if (statusNum >= 500) statusClass = 'status-server-error';
        }

        const formattedTime = new Date(group.timestamp).toLocaleTimeString();

        responseRow.innerHTML = `
          <td>${formattedTime}</td>
          <td class="log-type response">RESPONSE</td>
          <td>${response.method}</td>
          <td class="url">${response.url}</td>
          <td class="${statusClass}">${response.status || '-'}</td>
          <td>${group.responses.length > 1 ? 'Has error details' : ''}</td>
        `;

        // Add click event to show details
        if (group.responses.length > 1) {
          responseRow.addEventListener('click', () => {
            // Find response error details
            const errorResponse = group.responses.find(r => r.type === 'RESPONSE ERROR');
            if (errorResponse) {
              alert(`Response Error:\n${errorResponse.details}`);
            }
          });
          responseRow.classList.add('has-details');
        }

        tableBody.appendChild(responseRow);
      }
    });

    httpLogTable.appendChild(tableBody);
    logDisplay.appendChild(httpLogTable);
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
    [100, 200, 500, 1000, 2000].forEach(count => {
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
      logsBtn.textContent = 'HTTP Logs'; // Update button text
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
