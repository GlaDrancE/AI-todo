"use client";

import { useEffect, useState } from "react";
import { Trash2, Upload, FileText, Image, FileSpreadsheet, File, X, Check } from "lucide-react";
import Dashboard from "./layout";
import { useUser } from "@clerk/nextjs"
import AIContextService from "@/services/AIContextService";
import { currentUser } from "@clerk/nextjs/server";

interface TodoFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  files: TodoFile[];
  createdAt: Date;
}

function TodoComponent() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { user, isLoaded } = useUser()
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (isLoaded && user) {
      fetchTodos()
    }
  }, [isLoaded, user])
  const fetchTodos = async () => {
    try {
      const response = await fetch('/api/todo');
      if (response.ok) {
        const data = await response.json();
        setTodos(data);
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };


  const handleAddTodo = async () => {
    if (inputValue.trim() === "" || isLoading) return;

    setIsLoading(true);
    try {
      const filesData = selectedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file), // In production, upload to storage first
      }));

      const response = await fetch('/api/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputValue,
          files: filesData,
        }),
      });

      if (response.ok) {
        await fetchTodos();
        setInputValue("");
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };


  const toggleTodo = async (id: string, currentCompleted: boolean) => {
    try {
      const response = await fetch(`/api/todo/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted }),
      });

      if (response.ok) {
        await fetchTodos();
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todo/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTodos();
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (type.includes("pdf")) return <FileText className="w-4 h-4" />;
    if (type.includes("word") || type.includes("document")) return <FileText className="w-4 h-4" />;
    if (type.includes("csv") || type.includes("spreadsheet") || type.includes("excel"))
      return <FileSpreadsheet className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleGenerateTodo = async () => {
    const response = await fetch("/api/ai/generate-todo")
    const data = await response.json();
    const todos = data.todos.map((todo: string) => ({
      id: crypto.randomUUID(),
      text: todo,
      completed: false,
      files: [],
      createdAt: new Date(),
    }));
    const todoResponse = await fetch("/api/todo/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todos: data.todos }),
    });
    const todoData = await todoResponse.json();
    console.log(todoData)
  }

  const handleAnalyzeTodo = async () => {
    const todoText = todos.map((todo) => todo.text).join("\n");
    const response = await fetch("/api/ai/analyze-todo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todoText: todoText }),
    });
    const data = await response.json();
    console.log(data)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden">

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2 animate-glow">
            Cosmic Todo
          </h1>
          <p className="text-purple-200/70">Organize your universe, one task at a time</p>
        </div>

        {/* Input Section */}
        <div className="cosmic-card p-6 mb-8">
          <div className="space-y-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddTodo()}
              placeholder="Add a new cosmic task..."
              className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg 
                       text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 
                       focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm"
            />

            {/* File Upload */}
            <div className="flex items-center gap-4">
              {/* <label className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 
                               border border-purple-500/30 rounded-lg cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-purple-300" />
                <span className="text-sm text-purple-200">Attach Files</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.csv,.xlsx,.xls,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label> */}

              <button
                onClick={handleAddTodo}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 
                         hover:to-pink-700 text-white rounded-lg font-medium transition-all transform 
                         hover:scale-105 active:scale-95"
              >
                Add Task
              </button>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-purple-500/20"
                  >
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <span className="text-sm text-purple-200">{file.name}</span>
                      <span className="text-xs text-purple-400/60">{formatFileSize(file.size)}</span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Todo List */}
        <div className="space-y-3">
          {todos.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-block p-4 bg-purple-600/10 rounded-full mb-4">
                <Check className="w-12 h-12 text-purple-400/50" />
              </div>
              <p className="text-purple-300/60">No tasks yet. Add your first cosmic task above!</p>
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className={`cosmic-card p-4 transition-all transform hover:scale-[1.01] ${todo.completed ? "opacity-60" : ""
                  }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                              ${todo.completed
                        ? "bg-gradient-to-br from-green-400 to-emerald-500 border-green-400"
                        : "border-purple-500/50 hover:border-purple-400"
                      }`}
                  >
                    {todo.completed && <Check className="w-3 h-3 text-white" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-white mb-2 ${todo.completed ? "line-through text-purple-300/50" : ""
                        }`}
                    >
                      {todo.text}
                    </p>

                    {/* Files */}
                    {todo.files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {todo.files.map((file) => (
                          <a
                            key={file.id}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 
                                     hover:bg-purple-600/30 border border-purple-500/30 rounded-lg 
                                     text-xs text-purple-200 transition-colors group"
                          >
                            {getFileIcon(file.type)}
                            <span className="max-w-[150px] truncate group-hover:text-white">
                              {file.name}
                            </span>
                            <span className="text-purple-400/60">{formatFileSize(file.size)}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
                  >
                    <Trash2 className="w-4 h-4 text-red-400/70 group-hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* AI Action Buttons */}
        <div className="flex justify-center gap-4 mt-8 mb-6">
          <button
            onClick={handleGenerateTodo}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 
                     hover:to-blue-700 text-white rounded-lg font-medium transition-all transform 
                     hover:scale-105 active:scale-95 shadow-lg hover:shadow-cyan-500/25 
                     border border-cyan-500/30 backdrop-blur-sm"
          >
            <span className="flex items-center gap-2">
              ✨ Generate Todo
            </span>
          </button>
          <button
            onClick={handleAnalyzeTodo}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 
                     hover:to-pink-700 text-white rounded-lg font-medium transition-all transform 
                     hover:scale-105 active:scale-95 shadow-lg hover:shadow-purple-500/25 
                     border border-purple-500/30 backdrop-blur-sm"
          >
            <span className="flex items-center gap-2">
              🔍 Analyze Todo
            </span>
          </button>
        </div>
        {/* Stats */}
        {todos.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-purple-300/60 text-sm">
              {todos.filter((t) => t.completed).length} of {todos.length} tasks completed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Todo() {

  return (
    <TodoComponent />
  )
}