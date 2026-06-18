import React, { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Card, Input, Space, Spin, Tag, Typography, message } from 'antd';
import { CompassOutlined, MessageOutlined, SendOutlined, ThunderboltOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

const starterMessage = {
  role: 'assistant',
  content: "Hello! I'm your Talk2Campus assistant. Ask me about campus buildings, upcoming events, or your class schedule.",
  timestamp: new Date(),
  sources: ['Talk2Campus campus data'],
};

const quickQuestions = [
  'Where is the Mary and Jeff Bell Library?',
  'What events are happening today?',
  'Do I have any class schedule conflicts with campus events?',
  'How do I find the engineering building?',
];

const AIAgent = () => {
  const [messages, setMessages] = useState([starterMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuickQuestion = (question) => {
    setInputValue(question);
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) {
      if (!trimmed) message.warning('Please enter a message');
      return;
    }

    const userMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = nextMessages
        .slice(-8)
        .filter((item) => item.role === 'user' || item.role === 'assistant')
        .map((item) => ({ role: item.role, content: item.content }));

      const response = await axios.post(
        '/chat',
        { message: trimmed, history },
        { withCredentials: true }
      );

      const aiMessage = {
        role: 'assistant',
        content: response.data?.answer || 'I could not generate a response right now.',
        timestamp: new Date(),
        sources: Array.isArray(response.data?.sources) ? response.data.sources : [],
        grounded: Boolean(response.data?.grounded),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const detail = err?.response?.data?.detail || 'The assistant could not answer right now.';
      message.error(detail);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'I could not reach the campus knowledge service right now. Please try again in a moment.',
          timestamp: new Date(),
          sources: [],
          grounded: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      <div
        className="fade-in assistant-heading"
        style={{
          textAlign: 'center',
          marginBottom: 32,
          padding: '40px 24px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          borderRadius: 24,
        }}
      >
        <Space direction="vertical" size={16}>
          <div
            style={{
              display: 'inline-flex',
              padding: 20,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
            }}
          >
            <CompassOutlined style={{ fontSize: 48, color: 'white' }} />
          </div>
          <Title
            level={1}
            style={{
              marginBottom: 0,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Ask Talk2Campus
          </Title>
          <Paragraph style={{ fontSize: 18, color: '#666', marginBottom: 0 }}>
            Ask about campus buildings, upcoming events, or how plans fit your class schedule.
          </Paragraph>
        </Space>
      </div>

      <Card
        className="slide-in-left"
        style={{
          marginBottom: 24,
          borderRadius: 16,
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: 16, color: '#2c3e50' }}>
            <ThunderboltOutlined style={{ color: '#667eea', marginRight: 8 }} />
            Quick Questions
          </Text>
          <Space wrap size={[8, 8]}>
            {quickQuestions.map((question) => (
              <Button
                key={question}
                onClick={() => handleQuickQuestion(question)}
                style={{
                  borderRadius: 20,
                  border: '2px solid #e0e7ff',
                  background: 'white',
                  color: '#667eea',
                  fontWeight: 500,
                }}
              >
                {question}
              </Button>
            ))}
          </Space>
        </Space>
      </Card>

      <Card
        className="fade-in"
        style={{
          height: 540,
          borderRadius: 16,
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        bodyStyle={{
          padding: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            background: 'linear-gradient(to bottom, #fafafa 0%, #ffffff 100%)',
          }}
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {messages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}-${msg.timestamp?.toString?.() || index}`}
                className="fade-in"
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                <Space
                  align="start"
                  direction={msg.role === 'user' ? 'horizontal-reverse' : 'horizontal'}
                  size={12}
                  style={{ maxWidth: '78%' }}
                >
                  <Avatar
                    icon={msg.role === 'user' ? <UserOutlined /> : <MessageOutlined />}
                    style={{
                      background:
                        msg.role === 'user'
                          ? 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    size="large"
                  />
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 16,
                      background:
                        msg.role === 'user'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'white',
                      color: msg.role === 'user' ? 'white' : '#2c3e50',
                      boxShadow:
                        msg.role === 'user'
                          ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                          : '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  >
                    <Text
                      style={{
                        color: msg.role === 'user' ? 'white' : '#2c3e50',
                        fontSize: 15,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.content}
                    </Text>
                    {msg.role === 'assistant' && Array.isArray(msg.sources) && msg.sources.length > 0 ? (
                      <div style={{ marginTop: 10 }}>
                        <Space wrap size={[6, 6]}>
                          {msg.sources.map((source) => (
                            <Tag key={source} color="blue">
                              {source}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    ) : null}
                    <div
                      style={{
                        fontSize: 11,
                        marginTop: 6,
                        opacity: 0.7,
                        color: msg.role === 'user' ? 'white' : '#666',
                      }}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </Space>
              </div>
            ))}
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Space align="start" size={12}>
                  <Avatar
                    icon={<MessageOutlined />}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    size="large"
                  />
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 16,
                      background: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  >
                    <Spin size="small" />
                    <Text style={{ marginLeft: 8, color: '#666' }}>Checking campus data...</Text>
                  </div>
                </Space>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </Space>
        </div>

        <div
          style={{
            padding: 16,
            borderTop: '1px solid #f0f0f0',
            background: 'white',
          }}
        >
          <Space.Compact style={{ width: '100%' }} size="large">
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything about campus..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{
                borderRadius: '12px 0 0 12px',
                fontSize: 15,
                padding: '12px 16px',
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isLoading}
              style={{
                height: 'auto',
                borderRadius: '0 12px 12px 0',
                padding: '0 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
              }}
            >
              Send
            </Button>
          </Space.Compact>
        </div>
      </Card>
    </div>
  );
};

export default AIAgent;
