// English copy for /chat; it travels with the page's own chunk.
export const CHAT_EN = {
  'chat.subtitle':
    'A small AI model that runs in your browser, on your own device. What you write is never sent anywhere.',
  'chat.modelHeading': 'The Model',
  'chat.intro':
    'Gemma 3 270M is a tiny open model from Google. Your browser downloads it once from Hugging Face and keeps it on this device, where it does all of its thinking.',
  'chat.checking': 'Checking this device…',
  'chat.unsupported':
    "This browser can't run the model. It needs WebGPU, which recent versions of Chrome, Edge and Safari have.",
  'chat.download': 'Download model ({size} MB)',
  'chat.downloadHelp': 'The download is large, so on a phone it is best done on Wi-Fi.',
  'chat.onDevice': 'The model is on this device and takes {size} MB.',
  'chat.partial': 'Part of the model is on this device and takes {size} MB.',
  'chat.start': 'Start the model',
  'chat.downloading': 'Downloading the model',
  'chat.starting': 'Starting the model',
  'chat.progress': '{loaded} of {total} MB',
  'chat.cancel': 'Cancel',
  'chat.running': 'The model is running and takes {size} MB on this device.',
  'chat.notKept':
    'The model is running, but your browser did not keep its files. It will be downloaded again next time.',
  'chat.delete': 'Delete model',
  'chat.deleting': 'Deleting…',
  'chat.deleted': 'The model has been deleted from this device.',
  'chat.errorLoad':
    'The model could not be started. The download may have been interrupted, or this device may not have enough memory for it.',
  'chat.errorGenerate':
    'The model stopped before it finished its answer. Start it again to go on with the conversation.',
  'chat.errorDelete':
    "The model could not be deleted. Clearing this site's data in your browser's settings removes it too.",
  'chat.conversationHeading': 'Conversation',
  'chat.locked': 'Start the model to chat with it.',
  'chat.empty': 'Ask it something.',
  'chat.messages': 'Messages',
  'chat.you': 'You',
  'chat.gemma': 'Gemma',
  'chat.writing': 'Writing…',
  'chat.answered': 'Gemma answered: {answer}',
  'chat.inputLabel': 'Your message',
  'chat.placeholder': 'Write a message',
  'chat.send': 'Send',
  'chat.stop': 'Stop',
  'chat.clear': 'Clear conversation',
  'chat.disclaimer':
    "A model this small often gets facts wrong and makes things up, so don't rely on what it says. The conversation is kept only until you leave this page.",
  'chat.terms': 'Gemma is provided under the Gemma Terms of Use',
  'chat.runtime': 'Runs on Transformers.js',
} as const;
