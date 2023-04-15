// All in one file for your misery
// Yes, I'm aware of all the bad practices and inconsistencies in this code. No, I do not care

let historyLength = 50;

function addShoutbox() 
{
  // Get position on page
  const insertAfterThisElement = document.querySelector(".section.profilePostList"); // Original position I think?

  // Create shoutbox element
  const shoutboxElement = document.createElement("div");
  shoutboxElement.id = "shoutbox";

  fetch(chrome.runtime.getURL("html/shoutbox.html"))
  .then(response => response.text())
  .then(html => 
  {
    // Set shoutbox HTML content
    shoutboxElement.innerHTML = html;

    // Add to page at default position. Worry about moving later
    insertAfter(shoutboxElement, insertAfterThisElement);

    // Shoutbox is now initialized. Continue setting up
    afterShoutboxCreated();
  })
  .catch(error => console.error(error));
}



function afterShoutboxCreated()
{
  // Attach listeners to send message controls 
  initializeControls();

  // Start attempting to connect to server
  connectToShoutbox();
}



async function initializeControls()
{
  const submitButton = document.getElementById("shoutButton");
  const textBox = document.getElementById("shoutboxInputField");
  const title = document.getElementById("shoutboxTitle");
  const communityCheckbox = document.getElementById("hideCommunityBox");
  const locationDropdown = document.getElementById("shoutboxLocation");
  const sizeDropdown = document.getElementById("shoutboxSize");
  const historyDropdown = document.getElementById("msgHistoryLength");
  const timestampDropdown = document.getElementById("timestampType");
  const nameContainer = document.querySelector(".shoutboxGuestContainer");
  const nameField = document.getElementById("shoutboxGuestUsername");
  const historyCheckbox = document.getElementById("removeHistory");
  const localhostCheckbox = document.getElementById("useLocalhost");
  const newThreadCheckbox = document.getElementById("showNewThreads");
  const greentextCheckbox = document.getElementById("enableGreentext");
  const idCheckbox = document.getElementById("showIDs");
  const shoutboxVersion = document.getElementById("shoutboxVersion");


  // Make "send message" button clickable
  submitButton.addEventListener("click", sendMessage);


  // Allow sending messages with enter
  textBox.addEventListener("keydown", (event) => 
  {
    if (event.key === "Enter") 
    {
      event.preventDefault(); 
      submitButton.click(); 
    }
  });


  // Options menu when clicking shoutbox title
  title.addEventListener("click", () => 
  {
    // Open options if closed, close options if open
    toggleOptions();
  });

  // Start options closed
  optionsIsOpen = true;
  toggleOptions();


  // Set up "Hide community" checkbox
  getSetting("communityDisabled", true).then(function(value) 
  {
    // Load and apply saved setting
    //console.log("Community is disabled: " + value);
    communityCheckbox.checked = value;
    saveSetting("communityDisabled", value);
    disableCommunitySection(value);
    
    // Make checkbox work
    communityCheckbox.addEventListener("change", function() 
    {
      // Set state and save option to browser
      disableCommunitySection(this.checked);
      saveSetting("communityDisabled", this.checked);
    });
  });
  

  // Set up box location dropdown 
  getSetting("shoutboxPosition", "default").then(function(value) 
  {
    locationDropdown.value = value;
    saveSetting("shoutboxPosition", value);
    moveShoutBox(value);
    
    locationDropdown.addEventListener("change", function() 
    {
      moveShoutBox(this.value);
      saveSetting("shoutboxPosition", this.value);
    });
  });


  // Set up box size dropdown 
  getSetting("shoutboxSize", "medium").then(function(value) 
  {
    sizeDropdown.value = value;
    saveSetting("shoutboxSize", value);
    setShoutboxSize(value);
    
    sizeDropdown.addEventListener("change", function() 
    {
      setShoutboxSize(this.value);
      saveSetting("shoutboxSize", this.value);
    });
  });


  // Set up message history length dropdown 
  getSetting("msgHistoryLength", "50").then(function(value) 
  {
    historyDropdown.value = value;
    saveSetting("msgHistoryLength", value);
    historyLength = value;
    //refreshChatFull();

    historyDropdown.addEventListener("change", function() 
    {
      historyLength = this.value;
      refreshChatFull();
      saveSetting("msgHistoryLength", this.value);
    });
  });


  // Set up timestamp style dropdown 
  getSetting("timestampStyle", "none").then(function(value) 
  {
    timestampDropdown.value = value;
    timestampStyle = value;
    reformatTimestamps();
    scrollToBottom();
    saveSetting("timestampStyle", value);

    timestampDropdown.addEventListener("change", function() 
    {
      timestampStyle = this.value;
      reformatTimestamps();
      scrollToBottom();
      saveSetting("timestampStyle", this.value);
    });
  });


  // Set up guest username box
  setGuestID();

  if (getCurrentUserID() != 0)
  {
    // If logged in, don't allow guest usernames
    nameContainer.remove();
  }

  getSetting("shoutboxGuestName", "").then(function(value) 
  {
    // Load and apply saved setting
    nameField.value = value;
    saveSetting("shoutboxGuestName", value);
    
    // Make dropdown work
    nameField.addEventListener("change", function() 
    {
      saveSetting("shoutboxGuestName", this.value);
    });
  });


  // Set up checkbox for removing flooding messages
  getSetting("clearOldMessages", true).then(function(value) 
  {
    // Load and apply saved setting
    historyCheckbox.checked = value;
    saveSetting("clearOldMessages", value);
    clearMessages = value;
    
    // Make checkbox work
    historyCheckbox.addEventListener("change", function() 
    {
      // Set state, save option to browser and clear excess messages
      clearMessages = this.checked;
      refreshChatFull();
      saveSetting("clearOldMessages", this.checked);
    });
  });


  // Set up "Use localhost server (debug)" checkbox
  getSetting("useLocalhost", false).then(function(value) 
  {
    // Load and apply saved setting
    localhostCheckbox.checked = value;
    saveSetting("useLocalhost", value);
    useLocalhost = value;
    restartSocket();
    
    // Make checkbox work
    localhostCheckbox.addEventListener("change", function() 
    {
      // Set state, save option to browser and clear excess messages
      useLocalhost = this.checked;
      restartSocket();
      saveSetting("useLocalhost", this.checked);
    });
  });


  // Set up new thread feed checkbox
  getSetting("showNewThreads", true).then(function(value) 
  {
    // Load and apply saved setting
    newThreadCheckbox.checked = value;
    saveSetting("showNewThreads", value);
    showNewThreads = value;
    //refreshChatFull();
    
    // Make checkbox work
    newThreadCheckbox.addEventListener("change", function() 
    {
      // Set state, save option to browser and clear excess messages
      showNewThreads = this.checked;
      refreshChatFull();
      saveSetting("showNewThreads", this.checked);
    });
  });


  // Set up "enable greentexting" checkbox
  getSetting("enableGreentext", true).then(function(value) 
  {
    // Load and apply saved setting
    greentextCheckbox.checked = value;
    enableGreentext = value;
    //refreshChatFull();
    
    // Make checkbox work
    greentextCheckbox.addEventListener("change", function() 
    {
      // Set state, save option to browser and clear excess messages
      enableGreentext = this.checked;
      refreshChatFull();
      saveSetting("enableGreentext", this.checked);
    });
  });

  // Set up ID debug checkbox
  getSetting("showIDs", false).then(function(value) 
  {
    // Load and apply saved setting
    idCheckbox.checked = value;
    showIDs = value;
    
    // Make checkbox work
    idCheckbox.addEventListener("change", function() 
    {
      // Set state, save option to browser and clear excess messages
      showIDs = this.checked;
      refreshChatFull();
      saveSetting("showIDs", this.checked);
    });
  });

  refreshChatFull();

  // Write extension version to options
  shoutboxVersion.textContent = getVersion();
}

let clearMessages = null;
let useLocalhost = null;
let showNewThreads = null;
let timestampStyle = null;
let enableGreentext = null;
let showIDs = null;



function disableCommunitySection(isDisabled)
{
  const sidebar = document.querySelector(".sidebar");
  const sections = sidebar.querySelectorAll(".section");

  if (isDisabled)
  {
    sections[1].style.display = "none";
  }
  else
  {
    sections[1].style.display = "block";
  }
}


currentPosition = null;
function moveShoutBox(position)
{
  // Curse whoever thought it was a good idea to name some sections but not others
  const original = document.querySelector(".section.profilePostList");
  const middle = document.querySelector(".section.threadList");
  const top = document.querySelector(".sidebar").querySelectorAll(".section")[2];

  const shoutbox = document.querySelector('.section.shoutbox');
  
  if (currentPosition === position)
  {
    return;
  }

  if (position === "middle")
  {
    middle.parentNode.insertBefore(shoutbox, middle);
  }
  else if (position === "top")
  {
    top.parentNode.insertBefore(shoutbox, top);
  }
  else // Original and fallback
  {
    original.appendChild(shoutbox);
  }

  currentPosition = position;
  scrollToBottom();
}



function setShoutboxSize(size)
{
  const shoutbox = document.querySelector("#shoutboxBox");

  if (size === "small")
  {
    shoutbox.style.height = "128px";
  }
  else if (size === "medium")
  {
    shoutbox.style.height = "256px";
  }
  else if (size === "large")
  {
    shoutbox.style.height = "384px";
  }
  else if (size === "huge")
  {
    shoutbox.style.height = "512px";
  }
}



// Save a value to browser
function saveSetting(key, value) 
{
  return new Promise(function(resolve, reject) 
  {
    chrome.storage.local.set({[key]: value}, function() 
    {
      //console.log(`Setting ${key} saved as ${value}`);
      resolve();
    });
  });
}

// Get a value that's saved into browser
function getSetting(key, valueIfDoesNotExist) 
{
  return new Promise(function(resolve, reject) 
  {
    chrome.storage.local.get(key, function(data) 
    {
      if (chrome.runtime.lastError) 
      {
        reject(chrome.runtime.lastError);
      } 
      else 
      {
        resolve(data[key] !== undefined ? data[key] : valueIfDoesNotExist);
      }
    });
  });
}



function insertAfter(newNode, referenceNode) 
{
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}



let messageQueue = [];
let messageIDs = [];

//    function  addThread(type, username, userID, title,          unixTime, messageID, link)
async function addMessage(type, username, userID, messageContent, unixTime, messageID, extra)
{
  // Skip if duplicate
  if (messageIDs.includes(messageID)) 
  {
    return;
  }
  messageIDs.push(messageID);

  // Add if new
  const message = { type, username, userID, messageContent, unixTime, messageID, extra };
  messageQueue.push(message);

  if (messageQueue.length === 1) 
  {
    await processMessage();
  }
}

async function processMessage() 
{
  const { type, username, userID, messageContent, unixTime, messageID, extra } = messageQueue[0];
  const avatarURL = getAvatarURL(userID, "s", username);
  const messageList = document.querySelector(".shoutboxMessages");


  // List entry that contains all elements of message
  const messageContainer = document.createElement("li");
  messageContainer.className = "shoutboxMessage";
  messageContainer.id = messageID;


  // Timestamp
  const timestampContainer = document.createElement("div");
  timestampContainer.className = "shoutboxTimestamp";
  messageContainer.appendChild(timestampContainer);
  const timestamp = document.createElement("span");
  timestamp.className = "muted shoutboxTimestampText";
  timestamp.textContent = getFormattedTimestamp(unixTime);
  timestamp.setAttribute("data-timestamp", unixTime);
  timestampContainer.appendChild(timestamp);
  timestampContainer.style.display = timestampStyle == "none" ? "none" : "inline";
  

  // Profile picture
  const pfpImage = new Image();
  pfpImage.src = avatarURL;
  pfpImage.width = 16;
  pfpImage.id = "shoutboxPfpImage";

  const pfpContainer = document.createElement("a");
  pfpContainer.appendChild(pfpImage);
  pfpContainer.className = "avatar Av" + userID + "m";  // Only medium size is reliably available for your own avatar on front page
  pfpContainer.id = "shoutboxPfpContainer";
  pfpContainer.href = "members/" + userID; 
  messageContainer.appendChild(pfpContainer);


  // Username
  const usernameText = document.createElement("a");
  usernameText.textContent = username;
  usernameText.href = "members/" + userID; 
  usernameText.class = "username";
  usernameText.id = "shoutboxUsername";
  messageContainer.appendChild(usernameText);


  // New message or thread
  if (type === "message")
  {
    // Create element
    const messageText = document.createElement("span")
    messageText.innerHTML = ": " + linkify(messageContent);  // Detect links and make them clickable
    messageContainer.appendChild(messageText);

    // Greentextify
    if (enableGreentext && messageContent.charAt(0) == ">") 
    {
      messageText.style.color = "#00C000";
    }

    // If received a username color from server
    if (extra != null) 
    {
      usernameText.setAttribute("style", "color: " + extra + " !important;"); // Extra: Color for messages
    }
  }
  else if (type === "thread")
  {
    const messageText = document.createElement("a")
    messageText.textContent = messageContent;  
    messageText.href = extra; // Extra: Link for threads
    messageText.style.fontStyle = "italic";
    usernameText.style.fontStyle = "italic";
    messageContainer.appendChild(messageText);
  }


  // Debug message ID
  const messageIDText = document.createElement("span");
  messageIDText.textContent = (` [${messageID}]`).toUpperCase();
  messageIDText.style.color = "yellow";
  messageContainer.appendChild(messageIDText);
  messageIDText.style.display = showIDs ? "inline" : "none";


  // Add full message element to shoutbox
  messageList.appendChild(messageContainer);
  reorderPfpTimestamp(timestampContainer);
  scrollToBottom();


  // Remove processed message
  messageQueue.shift();

  if (messageQueue.length > 0) 
  {
    await processMessage();
  }
}



function getAvatarURL(userID, size, username) // Size: s, m, l
{
  if (userID == "0")
  {
    // Moss easter egg because I miss moss
    if (username != null)
    {
      if (username.slice(0, 4).toLowerCase() === "moss" && username.length === 16)
      {
        return "https://forums.wynncraft.com/data/avatars/s/41/41236.jpg";
      }
    }
    
    // Default steve if not logged in
    return "https://i.imgur.com/mnXtDOj.png";
  }

  return "https://forums.wynncraft.com/data/avatars/" + 
    size + "/" + 
    getUserFolder(userID) + "/" + 
    userID + ".jpg";
}



function getUserFolder(userID)
{
  // Return the folder that the user's data resides in on the wynncraft forums server
  // Guessing this is used for performance reasons on the forums? 
  return Math.floor(userID / 1000);
}



function getVersion()
{
  const manifest = chrome.runtime.getManifest();
  return manifest.version;
}



function getProfileURL(userID)
{
  return "https://forums.wynncraft.com/members/" + userID;
}



function getRedirectedURL(url) 
{
  return fetch(url)
    .then(response => response.url);
}



function getFastUsernameFromFullURL(urlWithName)
{
  // Split the URL by '/'
  const parts = urlWithName.split('/');
  
  // The username is the second-to-last part of the URL
  const usernameWithId = parts[parts.length - 2];
  
  // Remove the ID from the username
  const username = usernameWithId.split('.')[0];

  // Capitalize first letter
  const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
  
  return capitalizedUsername;
}



function getRealUsernameFromURL(url)
{
  // 
}



function getCurrentUserID()
{
  try 
  {
    const profileCard = document.querySelector('.primaryContent.menuHeader');
    const usernameLink = profileCard.querySelector('a.concealed');
    const userID = usernameLink.getAttribute('href').match(/(\d+)\/$/)[1];

    return userID;
  } 
  catch 
  {
    return 0;
  }
}



function getCurrentUsername()
{
  // Starry night, 100% reliable
  const username1 = document.querySelector(".accountUsername");
  
  // Other themes. Reliable so far, but extensive testing needed
  const profileCard = document.querySelector('.primaryContent.menuHeader');
  const username2 = profileCard.querySelector('a.concealed');

  //const username3 = document.querySelector(".username"); // No, could be anyone's username

  if (username1 != null)
  {
    // Logged in username
    return username1.textContent;
  }

  if (username2 != null)
  {
    // Logged in username
    return username2.textContent;
  }
  
  // Not signed in
  let guestUsername = document.querySelector("#shoutboxGuestUsername").value;
  guestUsername = guestUsername.trim().replace(/\s{2,}/g, " ");  // Remove whitespace and double spaces locally as well

  if (guestUsername != "")
  {
    return guestUsername + ` (Guest${guestID})`;
  }

  return "Guest" + guestID;
}



// Get guest ID or create it if it doesn't exist
let guestID = null;
async function setGuestID() 
{
  let value = await getSetting("guestID", 0);
  value = parseInt(value, 10); // In case it's a string *cough cough don't know how that'd happen*
  
  // In case something bad was saved *cough cough*
  if (!Number.isInteger(value) || value.toString().length !== 4) 
  {
    value = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
    await saveSetting("guestID", value);
  }
  
  guestID = value;
}



function getMessageBoxContents()
{
  const textBox = document.getElementById("shoutboxInputField");
  return textBox.value;
}



function scrollToBottom()
{
  var shoutboxList = document.querySelector("#shoutboxBox");
  shoutboxList.scrollTop = shoutboxList.scrollHeight;
}



let socket = null; 
let connecting = true;
let attemptingToConnect = null;

function initializeWebSocket() 
{
  attemptingToConnect = false;

  // Prevent multiple simultaneous connections
  if (socket && socket.readyState === WebSocket.OPEN)
  {
    return;
  }
  if (socket && (socket.readyState === WebSocket.CONNECTING))
  {
    socket.close();
  }

  if (useLocalhost)
  {
    socket = new WebSocket("ws://localhost:1195"); // Development
  }
  else
  {
    socket = new WebSocket("wss://shoutbox.aarontti.com:1195"); // Final
  }

  const shoutboxErrorBox = document.querySelector("#shoutboxError");
  

  socket.addEventListener("open", (event) => 
  {
    console.log("Shoutbox WebSocket connected successfully");

    shoutboxErrorBox.innerText = "";
    connecting = false;
    refreshChatFull();


    // Send extension version to server in case of future compatibility issues
    // Shouldn't break anything if removed when using latest version
    const version = getVersion();

    const data = 
    {
      type: "connectionInfo",
      version: version
    };
    
    socket.send(JSON.stringify(data));
  });

  socket.addEventListener("message", (event) => 
  {
    var parsedData = JSON.parse(event.data);
    var type = parsedData["type"];

    //console.log(`Received shoutbox ${type}: ${event.data}`); // Debugging message json
    
    if (type === "history") 
    {
      // Turn message history into messages when it's received
      receiveMessageHistory(parsedData.data);
    } 
    else if (type === "new") 
    {
      // Normal incoming message
      receiveMessage(parsedData.data);
    }
    else if (type === "remove")
    {
      // Remove message locally in real time
      removeMessage(parsedData.messageID);
    }
    else if (type === "color")
    {
      // Add color retrospectively through server, since fetching might take a long time
      colorizeName(parsedData.messageID, parsedData.color);
    }
    // Don't process at all if type is unknown
  });
  
  socket.addEventListener("error", (event) => 
  {
    continueAttempting();
  });

  socket.addEventListener("close", (event) => 
  {
    continueAttempting();
  });
}



function continueAttempting()
{
  if (attemptingToConnect)
  {
    return;
  }
  attemptingToConnect = true;

  const shoutboxErrorBox = document.querySelector("#shoutboxError");
  shoutboxErrorBox.innerText = "Connecting to shoutbox...";
  console.error("Shoutbox WebSocket unreachable. Retrying...");

  if (!connecting)
  {
    scrollToBottom();
  }
  connecting = true;

  setTimeout(connectToShoutbox, 2000);
}



function connectToShoutbox() 
{
  const shoutboxErrorBox = document.querySelector("#shoutboxError");

  // Check if the socket is already open
  if (socket && socket.readyState === WebSocket.OPEN) 
  {
    console.log("WebSocket already connected");
    shoutboxErrorBox.innerText = "";
    return;
  }

  // If not connected, initialize the WebSocket
  shoutboxErrorBox.innerText = "Connecting to shoutbox...";
  initializeWebSocket();
}



function restartSocket()
{
  if (!socket)
  {
    return;
  }

  if (socket && socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  {
    socket.close();
  }

  initializeWebSocket();
}





function receiveMessage(data)
{
  // Discard thread announcements if they're off
  if (!showNewThreads && data.type === "thread")
  {
    return;
  }

  // Process messages
  if (data.type === "message" || data.type === "thread")
  {
    // User message or new thread
    addMessage(data.type, data.username, data.userID, data.message, data.unixTime, data.messageID, data.extra);

    // "Make room" by deleting oldest message, if user so desires
    if (clearMessages)
    {
      trimOldMessages();
    }
  }
  else if (data.type === "generic")
  {
    // Announcements like outdated plugin, etc
    receiveGeneric(data);
  }
}



function receiveMessageHistory(history) 
{
  // Clear outdated message list
  messageQueue = [];
  messageIDs = [];
  
  clearAllMessages();

  // Add refreshed messages 
  history.forEach((message) => 
  {
    receiveMessage(message);
  });
}



function receiveGeneric(data)
{
  const content = data.content;
  const messageList = document.querySelector(".shoutboxMessages");
  const messageContainer = document.createElement("li");
  messageContainer.innerHTML = content;
  messageContainer.className = "shoutboxMessage";

  messageList.appendChild(messageContainer);
}



// Locally remove a message that's already been received
function removeMessage(messageID)
{
  const messageElement = document.getElementById(messageID);

  if (messageElement)
  {
    messageElement.remove();
  }
}


// Add color to a message that's already been received
function colorizeName(messageID, hex)
{
  const usernameText = document.getElementById(messageID).querySelector("#shoutboxUsername");
  
  if (usernameText)
  {
    usernameText.setAttribute("style", "color: " + hex + " !important;");
  }
}


function refreshChatFull()
{
  clearAllMessages();
  askForHistory();
}



async function askForHistory()
{
  // Manually demand server to send message history
  const data = 
  {
   type: "giveHistory",
   desiredHistoryLength: historyLength
  };
  
  // If socket is not defined, wait until it is
  return new Promise((resolve, reject) => 
  {
    const intervalId = setInterval(() => 
    {
      if (socket) 
      {
        clearInterval(intervalId);
        socket.send(JSON.stringify(data));
        resolve();
      }
    }, 100);
  });
}



// Remove messages that go beyond user-set target for performance
function trimOldMessages()
{
  const shoutboxElement = document.querySelector(".shoutboxMessages");
  const messages = shoutboxElement.querySelectorAll(".shoutboxMessage");

  if (messages.length > historyLength)
  {
    // Remove oldest message
    messages.item(0).remove();
  }
}



function clearAllMessages()
{
  const messages = document.querySelectorAll(".shoutboxMessage");

  messages.forEach((message) =>
  {
    message.remove();
  });
}



function sendMessage()
{
  // Get current user data and textbox contents
  _username = getCurrentUsername();
  _userID = getCurrentUserID();
  _message = getMessageBoxContents();

  // Prevent accidentally trying to send empty messages
  if (_message === "")
  {
    return;
  }

  const data = 
  {
    type: "message",
    username: _username,
    userID: _userID,
    message: _message
  };
  
  socket.send(JSON.stringify(data));          // Send to server
  //addMessage(_username, _userID, _message); // Add only locally (outdated, needs unique id now)
  clearInput();
}



function clearInput()
{
  const textBox = document.getElementById("shoutboxInputField");
  textBox.value = "";
}



let optionsIsOpen = false;

function toggleOptions()
{
  const shoutboxContents = document.querySelector(".shoutboxContainer");
  const optionsContents = document.querySelector(".shoutboxOptionsContainer");
  const title = document.getElementById("shoutboxTitle"); 

  optionsIsOpen = !optionsIsOpen;
  
  if (optionsIsOpen) 
  {
    title.textContent = "Shoutbox Options";
    shoutboxContents.style.display = "none";
    optionsContents.style.display = "block";
  } 
  else 
  {
    title.textContent = "Shoutbox";
    shoutboxContents.style.display = "block";
    optionsContents.style.display = "none";
  }
}



// Define timestamp visibility, location and time display
function reformatTimestamps()
{
  const timestamps = document.querySelectorAll(".shoutboxTimestamp");

  if (timestampStyle == "none")
  {
    // Just hide timestamps
    timestamps.forEach((timestamp) =>
    {
      timestamp.style.display = "none";
    });
  }
  else
  {
    timestamps.forEach((timestamp) =>
    {
      // Change timestamp format
      const timestampText = timestamp.querySelector(".shoutboxTimestampText");

      if (timestampText)
      {
        const unixTime = timestampText.getAttribute("data-timestamp");
        timestampText.textContent = getFormattedTimestamp(unixTime);
      }


      // Make element visible if it wasn't already
      timestamp.style.display = "inline";


      // Determine order
      
      reorderPfpTimestamp(timestamp);
    });
  }
}



function reorderPfpTimestamp(timestampElement)
{
  const parent = timestampElement.parentElement;
  pfpElement = parent.querySelector("#shoutboxPfpContainer");

  if (timestampStyle == "forum")
  {
    parent.insertBefore(timestampElement, pfpElement);
  }
  else if (timestampStyle == "classic")
  {
    parent.insertBefore(pfpElement, timestampElement);
  }
}



function getFormattedTimestamp(unixTime)
{
  switch (timestampStyle) 
  {
    case "forum":
      return getForumTimestamp(unixTime) + " ";
    case "classic":
      return getClassicTimestamp(unixTime) + " ";
    default:
      return "";
  }
}



function getForumTimestamp(unixTime) 
{
  const now = new Date();
  const messageTime = new Date(unixTime * 1000);
  
  // Calculate elapsed time in seconds
  const elapsed = (now.getTime() - messageTime.getTime()) / 1000;
  
  // Now
  if (elapsed < 60) {
    return "A moment ago";
  }
  
  // Minutes ago
  if (elapsed < 3600) {
    const minutes = Math.floor(elapsed / 60);

    if (minutes === 1)
    {
      return `${minutes} minute ago`;
    }

    return `${minutes} minutes ago`;
  }
  
  // Today
  const isToday = messageTime.getDate() === now.getDate() &&
                  messageTime.getMonth() === now.getMonth() &&
                  messageTime.getFullYear() === now.getFullYear();
  if (isToday) {
    const timeString = messageTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Today at ${timeString}`;
  }
  
  // Yesterday
  const yesterday = new Date(now.getTime() - 86400000);
  const isYesterday = messageTime.getDate() === yesterday.getDate() &&
                      messageTime.getMonth() === yesterday.getMonth() &&
                      messageTime.getFullYear() === yesterday.getFullYear();
  if (isYesterday) {
    const timeString = messageTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Yesterday at ${timeString}`;
  }
  
  // Within a week
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const messageDayOfWeek = messageTime.getDay();
  const dayOfWeekString = days[messageDayOfWeek];
  const timeString = messageTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (elapsed < 604800) { // 7 days in seconds
    return `${dayOfWeekString} at ${timeString}`;
  }
  
  // Older than a week
  return messageTime.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}



function getClassicTimestamp(unixTime) 
{
  const options = 
  {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  };

  return new Date(unixTime * 1000).toLocaleTimeString(navigator.language, options);
}



function refreshTimestamps()
{
  const timestamps = document.querySelectorAll(".shoutboxTimestampText");
  
  timestamps.forEach((timestamp) =>
  {
    const unixTime = timestamp.getAttribute('data-timestamp');
    timestamp.textContent = getFormattedTimestamp(unixTime);
  });
}

// Refresh timestamps every minute
setInterval(refreshTimestamps, 60000);



function linkify(text) 
{
  // Find URLs in string
  var urlRegex = /(https?:\/\/[^\s]+)/g;

  // Replace URLs with clickable links
  return text.replace(urlRegex, function(url) 
  {
    return '<a href="' + url + '">' + url + '</a>';
  });
}



addShoutbox();