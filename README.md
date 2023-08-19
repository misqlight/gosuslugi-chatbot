# Unofficial API for the chat from [gosuslugi.ru](https://gosuslugi.ru/)
![gosuslugi.ru chat](https://i.ibb.co/VM7mmRt/image.png)
![gosuslugi.ru chat](https://i.ibb.co/7KLxsrx/image.png)



# Usage
To connect you should create new `Chatbot` object:
```javascript
const { Chatbot } = require('gosuslugi-chatbot');
const chatbot = new Chatbot();
```
Then, you should use `connect` function to connect to the web server
```javascript
chatbot.connect();
```

You can handle events:
```javascript
chatbot.on('connect', () => {
    console.log('Connected!');
});
```

Available events:
- `connect` - connected to the web socket.
- `login` - authorization was successful
- `ping` - server sent ping request
- `close` - connection is closed.
- `message` - (Not recommended) called when the client receives a message. The callback function parameters include the request type (an integer), the data object, and the unformatted message text, respectively.

To send message you should use `hello` or `say` functions.
```javascript
await chatbot.hello();   // Sends greetings request.
await chatbot.say(text); // Sends request with the text from the argument.
```
In both cases, return object is answer from the chatbot.

When you done, you should close the connection:
```javascript
chatbot.close();
```

## Example
Ask how to make an appointment with a doctor (In Russian. Chatbot does not understand other languages except Russian)
```javascript
const { Chatbot } = require('gosuslugi-chatbot');
const chatbot = new Chatbot();

chatbot.on('login', () => {
    chatbot.say('Приём к врачу').then(answer => {
        console.log(answer.content);  // Log answer content
        console.log(answer.results.outside.map(result => `[${result.label}]`).join('\n')); // Log answer buttons
        chatbot.close();
    });
});

chatbot.connect();
```
Output should looks like that:
```
<p>Вот что я могу предложить по записи на приём к врачу</p><p>Если нужно записаться по направлению, перейдите <a href='https://www.gosuslugi.ru/10700/1/form/' target='_blank'>к услуге</a></p>
[Записаться к врачу]
[Порядок записи]
[Отмена или перенос записи]
[Возникла проблема]
[Проверить запись]
[Запись другого человека]
[Нет нужного ответа]
```
You can parse HTML however you like.
For example, you can easily make the content Markdown using Regular Expressions:
```javascript
answer.content = answer.content.replaceAll(/<p.*?>(.+?)<\/p>/g, '$1\n'); // Replacing paragraphs to text
answer.content = answer.content.replaceAll(/<a.*?href=(['"])(.+?)\1.*>(.+?)<\/a>/g, '[$3]($2)'); // Replacing links from HTML to Markdown
answer.content = answer.content.trim(); // trimming extra spaces
console.log(answer.content);
```
After that, the result looks better:
```
Вот что я могу предложить по записи на приём к врачу
Если нужно записаться по направлению, перейдите [к услуге](https://www.gosuslugi.ru/10700/1/form/)
```
