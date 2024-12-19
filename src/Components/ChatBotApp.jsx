import React, { useEffect, useRef, useState } from "react";
import "./ChatBotApp.css";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { motion } from "framer-motion";

const ChatBotApp = ({
  onGoBack,
  chats,
  setChats,
  activeChat,
  setActiveChat,
  onNewChat,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState(chats[0]?.messages || []);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const chatEndRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const activeChatObj = chats.find((chat) => chat.id === activeChat);
    setMessages(activeChatObj ? activeChatObj.messages : []);
  }, [activeChat, chats]);

  useEffect(() => {
    if (activeChat) {
      const storedMessages = JSON.parse(localStorage.getItem(activeChat)) || [];
      setMessages(storedMessages);
    }
  }, [activeChat]);

  useEffect(() => {
    if (chats.length > 0) {
      const lastChat = chats.reduce((latest, current) => {
        const lastMessageTimeLatest = new Date(
          latest.messages[latest.messages.length - 1]?.timestamp
        ).getTime();
        const lastMessageTimeCurrent = new Date(
          current.messages[current.messages.length - 1]?.timestamp
        ).getTime();
        return lastMessageTimeLatest > lastMessageTimeCurrent
          ? latest
          : current;
      });
      setActiveChat(lastChat.id);
    }
  }, [chats, setActiveChat]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target) &&
        !e.target.closest(".emoji")
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleEmojiSelect = (emoji) => {
    const input = document.querySelector(".msgInput");
    const cursorPos = input.selectionStart;
    const textBeforeCursor = inputValue.slice(0, cursorPos);
    const textAfterCursor = inputValue.slice(cursorPos);

    const newText = textBeforeCursor + emoji.native + textAfterCursor;
    setInputValue(newText);

    setTimeout(() => {
      input.selectionStart = cursorPos + emoji.native.length;
      input.selectionEnd = cursorPos + emoji.native.length;
    }, 0);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const sendMessage = async () => {
    if (inputValue.trim() === "") return;

    const newMessage = {
      type: "prompt",
      text: inputValue,
      timestamp: new Date().toLocaleTimeString(),
    };

    if (!activeChat) {
      onNewChat(inputValue);
      setInputValue("");
    } else {
      const updateMessages = [...messages, newMessage];
      setMessages(updateMessages);
      localStorage.setItem(activeChat, JSON.stringify(updateMessages));
      setInputValue("");

      const updatedChats = chats.map((chat) => {
        if (chat.id === activeChat) {
          return { ...chat, messages: updateMessages };
        }
        return chat;
      });
      setChats(updatedChats);
      localStorage.setItem("chats", JSON.stringify(updatedChats));
      setIsTyping(true);

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: inputValue }],
            max_tokens: 150,
          }),
        }
      );
      const data = await response.json();
      const chatResponse = data.choices[0].message.content.trim();

      const newResponse = {
        type: "response",
        text: chatResponse,
        timestamp: new Date().toLocaleTimeString(),
      };

      const updatedMessagesWithResponse = [...updateMessages, newResponse];
      setMessages(updatedMessagesWithResponse);
      localStorage.setItem(
        activeChat,
        JSON.stringify(updatedMessagesWithResponse)
      );
      setIsTyping(false);

      const updatedChatsWithResponse = chats.map((chat) => {
        if (chat.id === activeChat) {
          return { ...chat, messages: updatedMessagesWithResponse };
        }
        return chat;
      });
      setChats(updatedChatsWithResponse);
      localStorage.setItem("chats", JSON.stringify(updatedChatsWithResponse));
    }
  };

  const handleSelectChat = (id) => {
    setActiveChat(id);
  };

  const handleDeleteChat = (id) => {
    const updatedChats = chats.filter((chat) => chat.id !== id);
    setChats(updatedChats);
    localStorage.setItem("chats", JSON.stringify(updatedChats));
    localStorage.removeItem(id);

    if (id === activeChat) {
      const newActiveChats =
        updatedChats.length > 0 ? updatedChats[0].id : null;
      setActiveChat(newActiveChats);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sortedChats = [...chats].sort((a, b) => {
    const lastMessageA = a.messages[a.messages.length - 1]?.timestamp;
    const lastMessageB = b.messages[b.messages.length - 1]?.timestamp;
    return new Date(lastMessageB) - new Date(lastMessageA);
  });

  return (
    <div className="chatApp">
      <div className={`chatList ${showChatList ? "show" : ""}`}>
        <div className="chatListHeader">
          <h4>Chat List</h4>
          <i
            className="bx bx-edit-alt newChat"
            onClick={() => onNewChat("New Chat")}
          ></i>
          <i
            className="bx bx-x-circle xMobile"
            onClick={() => setShowChatList(false)}
          ></i>
        </div>

        {sortedChats
          .slice()
          .reverse()
          .map((chat) => (
            <div
              key={chat.id}
              className={`chatListItem ${
                chat.id === activeChat ? "active" : ""
              }`}
              onClick={() => handleSelectChat(chat.id)}
            >
              <h5>{chat.displayId}</h5>
              <i
                className="bx bx-x-circle x"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChat(chat.id);
                }}
              ></i>
            </div>
          ))}
      </div>

      <div className="chatWindow">
        <div className="chatTitle">
          <i
            className="bx bx-menu menu"
            onClick={() => setShowChatList(true)}
          ></i>
          <h3>Ask the Bot</h3>
          <button className="home" onClick={onGoBack}>
            <i className="fa-solid fa-home"></i>
          </button>
        </div>
        <div className="chat">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={msg.type === "prompt" ? "prompt" : "response"}
            >
              {msg.text} <span>{msg.timestamp}</span>
            </div>
          ))}
          {isTyping && <div className="response">Typing...</div>}
          <div ref={chatEndRef}></div>
        </div>
        <form
          className="msgForm"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <i
            className="fa-solid fa-face-smile emoji"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
          ></i>
          {showEmojiPicker && (
            <motion.div
              ref={emojiPickerRef}
              className="picker"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="dark"
              />
            </motion.div>
          )}

          <textarea
            className="msgInput"
            placeholder="Type a message"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setShowEmojiPicker(false)}
            rows="2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          ></textarea>

          <i className="fa-solid fa-paper-plane" onClick={sendMessage}></i>
        </form>
      </div>
    </div>
  );
};

export default ChatBotApp;
