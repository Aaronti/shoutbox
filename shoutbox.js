// All in one file for your misery
// Yes, I'm aware of all the bad practices and inconsistencies in this code. No, I do not care

function addShoutbox() 
{
  // Get position on page
  const insertAfterThisElement = document.querySelector(".section.profilePostList"); // Original position I think?

  // Create shoutbox element
  const shoutboxElement = document.createElement("div");
  shoutboxElement.id = "shoutbox";

  fetch(chrome.extension.getURL("html/shoutbox.html"))
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
  const nameContainer = document.querySelector(".shoutboxGuestContainer");
  const nameField = document.getElementById("shoutboxGuestUsername");
  const timestampCheckbox = document.getElementById("enableTimestamps");


  // Make "send message" button clickable
  submitButton.addEventListener("click", sendMessage);


  // Allow sending messages with enter
  textBox.addEventListener("keydown", (event) => 
  {
    if (event.keyCode === 13) 
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
    // Load and apply saved setting
    locationDropdown.value = value;
    saveSetting("shoutboxPosition", value);
    moveShoutBox(value);
    
    // Make dropdown work
    locationDropdown.addEventListener("change", function() 
    {
      moveShoutBox(this.value);
      saveSetting("shoutboxPosition", this.value);
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


  // Set up "Show timestamps" checkbox
  getSetting("showTimestamps", false).then(function(value) 
  {
    // Load and apply saved setting
    timestampCheckbox.checked = value;
    saveSetting("showTimestamps", value);
    enableTimestamps(value);
    
    // Make checkbox work
    timestampCheckbox.addEventListener("change", function() 
    {
      // Set state and save option to browser
      enableTimestamps(this.checked);
      saveSetting("showTimestamps", this.checked);
    });
  });
}


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

async function addMessage(username, userID, messageContent, unixTime, messageID)
{
  // Skip if duplicate
  if (messageIDs.includes(messageID)) 
  {
    return;
  }
  messageIDs.push(messageID);

  // Add if new
  const message = { username, userID, messageContent, unixTime, messageID };
  messageQueue.push(message);

  if (messageQueue.length === 1) 
  {
    await processMessage();
  }
}



async function processMessage() 
{
  const { username, userID, messageContent, unixTime, messageID } = messageQueue[0];
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
  timestamp.textContent = formatTimestamp(unixTime + " ");
  timestamp.setAttribute("data-timestamp", unixTime);
  timestampContainer.appendChild(timestamp);

  if (timestampsEnabled)
  {
    timestampContainer.style.display = "inline";
  }
  else
  {
    timestampContainer.style.display = "none";
  }


  // Profile picture
  const pfpImage = new Image();
  pfpImage.src = avatarURL;
  pfpImage.width = 16;
  pfpImage.id = "shoutboxPfpImage";

  const pfpContainer = document.createElement("a");
  pfpContainer.appendChild(pfpImage);
  pfpContainer.className = "avatar Av" + userID + "m";  // Only medium size is available for your own avatar on front page
  pfpContainer.id = "shoutboxPfpContainer";
  pfpContainer.href = "members/" + userID; 
  messageContainer.appendChild(pfpContainer);


  // Username

  // Old method of getting username from ID. Allows usernames to stay up to date if changed, but is overall a shit way of handling it
  //const profileFullURL = await getRedirectedURL(getProfileURL(userID));
  //username = getFastUsernameFromFullURL(profileFullURL);  // Inaccurate results, but fast
  //const username = getRealUsernameFromURL(getProfileURL(userID)); // Accurate result, but slow. Also doesn't work

  const usernameText = document.createElement("a");
  usernameText.textContent = username;
  usernameText.href = "members/" + userID; 
  usernameText.class = "username";
  messageContainer.appendChild(usernameText);

  // Message
  const messageText = document.createElement("span")
  messageText.innerHTML = ": " + linkify(messageContent);  // Detect links and make them clickable
  messageContainer.appendChild(messageText);

  // Add full message element to shoutbox
  messageList.appendChild(messageContainer);
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
  if (userID === 0)
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
  // Return the folder that the user's data resides in on the server
  // Guessing this is used for performance reasons on the forums? 
  return Math.floor(userID / 1000);
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
  // Extract id from profile picture file name
  const miniPfp = document.querySelector(".miniMe");

  if (miniPfp === null)
  {
    // If not signed in
    return 0;
  }

  const pfpSrc = miniPfp.src;                       // For example "data/avatars/s/39/39067.jpg?1680634104"
  const userID = pfpSrc.match(/\/(\d+)\.jpg/)[1];   // Use regex to get only id
  
  return userID;
}



function getCurrentUsername()
{
  const usernameElement = document.querySelector(".accountUsername");

  if (usernameElement === null)
  {
    // If not signed in
    let guestUsername = document.querySelector("#shoutboxGuestUsername").value;
    guestUsername = guestUsername.trim().replace(/\s{2,}/g, " ");  // Remove whitespace and double spaces locally as well

    if (guestUsername != "")
    {
      return guestUsername + ` (Guest${guestID})`;
    }

    return "Guest" + guestID;
  }

  // Logged in username
  return usernameElement.textContent;
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

  //socket = new WebSocket("ws://localhost:1195"); // Development
  socket = new WebSocket("wss://shoutbox.aarontti.com:1195"); // Final
  const shoutboxErrorBox = document.querySelector("#shoutboxError");
  

  socket.addEventListener("open", (event) => 
  {
    console.log("Shoutbox WebSocket connected successfully");

    shoutboxErrorBox.innerText = "";
    connecting = false;
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






function receiveMessage(data)
{
  if (data.type === "message")
  {
    // User message
    const username = data.username;
    const userID = data.userID;
    const message = data.message;
    const unixTime = data.unixTime;
    const messageID = data.messageID;

    addMessage(username, userID, message, unixTime, messageID);
  }
  else
  {
    // New thread etc announcements. To-be-implemented if cloudflare ever stops sucking dick
    receiveGeneric(data);
  }
}



function receiveMessageHistory(history) 
{
  // Clear outdated message list
  messageQueue = [];
  messageIDs = [];
  const messages = document.querySelectorAll(".shoutboxMessage");

  messages.forEach((message) =>
  {
    message.remove();
  });

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



function removeMessage(messageID)
{
  const messageElement = document.getElementById(messageID);

  if (messageElement)
  {
    messageElement.remove();
  }
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



function formatTimestamp(unixTime) 
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



function refreshTimestamps()
{
  const timestamps = document.querySelectorAll(".shoutboxTimestampText");
  
  timestamps.forEach((timestamp) =>
  {
    const unixTime = timestamp.getAttribute('data-timestamp');
    timestamp.textContent = formatTimestamp(unixTime);
  });
}

// Refresh timestamps every minute
setInterval(refreshTimestamps, 60000);



let timestampsEnabled = false;
function enableTimestamps(enabled)
{
  const timestamps = document.querySelectorAll(".shoutboxTimestamp");
  timestampsEnabled = enabled;

  if (enabled)
  {
    timestamps.forEach((element) =>
    {
      element.style.display = "inline";
    });
  }
  else
  {
    timestamps.forEach((element) =>
    {
      element.style.display = "none";
    });
  }
}



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