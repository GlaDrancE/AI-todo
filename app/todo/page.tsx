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
  priority?: number;
  scheduledFor?: string | Date | null;
}

function TodoComponent() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [lastPriority, setLastPriority] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const stored = window.localStorage.getItem("lastPriority");
    const parsed = stored ? parseInt(stored, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const [scheduledFor, setScheduledFor] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("30");
  const [category, setCategory] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { user, isLoaded } = useUser()
  const [isLoading, setIsLoading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [improvedTodos, setImprovedTodos] = useState<Todo[]>([]);
  const [isGeneratingTodo, setIsGeneratingTodo] = useState(false);
  const [isAnalyzingTodo, setIsAnalyzingTodo] = useState(false);
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
        const sorted = [...data].sort((a: Todo, b: Todo) => {
          // Sort by priority if present, otherwise fallback to createdAt
          if (a.priority != null && b.priority != null) {
            return a.priority - b.priority;
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        setTodos(sorted);
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };


  const handleAddTodo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputValue.trim() === "" || isLoading) return;

    setIsLoading(true);
    const nextPriority = (lastPriority || 0) + 1;
    try {
      const filesData = selectedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file), // In production, upload to storage first
      }));

      if (typeof window !== "undefined") {
        window.localStorage.setItem("lastPriority", String(nextPriority));
      }

      const response = await fetch('/api/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputValue,
          priority: nextPriority,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          status: "SCHEDULED",
          completionEstimatedMinutes: Number(estimatedMinutes) || 0,
          category,
          files: filesData,
        }),
      });

      if (response.ok) {
        await fetchTodos();
        setLastPriority(nextPriority);
        setInputValue("");
        setScheduledFor("");
        setEstimatedMinutes("30");
        setCategory("");
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTodoStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/todo/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status, text: todos.find((todo) => todo.id === id)?.text }),
      });
      if (response.ok) {
        await fetchTodos();
      }
    } catch (error) {
      console.error('Error updating todo status:', error);
    }
  }


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
        body: JSON.stringify({ completed: !currentCompleted, text: todos.find(todo => todo.id === id)?.text }),
      });

      if (response.ok) {
        await fetchTodos();
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  // Drag and drop handlers for reordering (rescheduling by priority)
  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    if (!draggingId || draggingId === targetId) return;

    setTodos((current) => {
      const draggedIndex = current.findIndex((t) => t.id === draggingId);
      const targetIndex = current.findIndex((t) => t.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return current;

      const updated = [...current];
      const [moved] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  };

  const handleDragEnd = async () => {
    setDraggingId(null);
    try {
      const updates = todos.map((todo, index) => ({
        id: todo.id,
        priority: index + 1,
      }));

      await fetch("/api/todo/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      await fetchTodos();
    } catch (error) {
      console.error("Error reordering todos:", error);
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
    setIsGeneratingTodo(true);
    try {
      const response = await fetch("/api/ai/generate-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt: userPrompt })
      })
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
      await fetchTodos(); // Refresh the todo list
    } catch (error) {
      console.error('Error generating todos:', error);
    } finally {
      setIsGeneratingTodo(false);
    }
  }

  const handleAnalyzeTodo = async () => {
    setIsAnalyzingTodo(true);
    try {
      const todoText = todos.map((todo) => todo.text).join("\n");
      const response = await fetch("/api/ai/analyze-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoText: todoText }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.todos.improved_todo) {
          setImprovedTodos(data.todos.improved_todo.map((todo: string) => {
            return {
              id: crypto.randomUUID(),
              text: todo,
              completed: false,
              files: [],
              createdAt: new Date(),
            }
          }));
          setShowApprovalDialog(true);
        }
      }
      else {
        console.error('Error analyzing todo:', response.statusText);
      }
    } catch (error) {
      console.error('Error analyzing todo:', error);
    } finally {
      setIsAnalyzingTodo(false);
    }
  }

  const handleApproveImprovedTodos = async () => {
    try {
      const response = await fetch("/api/ai/analyze-todo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTodos: todos, newTodos: improvedTodos }),
      });
      if (response.ok) {
        await fetchTodos();
        setTodos(improvedTodos);
        setShowApprovalDialog(false);
        setImprovedTodos([]);
      }
      else {
        console.error('Error approving improved todos:', response.statusText);
      }
    } catch (error) {
      console.error('Error approving improved todos:', error);
    }
  }

  const handleRejectImprovedTodos = () => {
    setShowApprovalDialog(false);
    setImprovedTodos([]);
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
          <form onSubmit={handleAddTodo} className="space-y-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Add a new cosmic task..."
              className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg 
                       text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 
                       focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm"
            />

            {/* Task metadata inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-purple-200 mb-1">
                  Scheduled for
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-purple-500/30 rounded-lg 
                           text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 
                           focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-purple-200 mb-1">
                  Estimate (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-purple-500/30 rounded-lg 
                           text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 
                           focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm text-sm"
                  placeholder="e.g. 30"
                />
              </div>

              <div>
                <label className="block text-sm text-purple-200 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-purple-500/30 rounded-lg 
                           text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 
                           focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm text-sm"
                  placeholder="e.g. Work, Personal"
                />
              </div>
            </div>

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
          </form>
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
                draggable
                onDragStart={() => handleDragStart(todo.id)}
                onDragOver={(e) => handleDragOver(e, todo.id)}
                onDragEnd={handleDragEnd}
                className={`cosmic-card p-4 transition-all transform hover:scale-[1.01] ${todo.completed ? "opacity-60" : ""
                  } ${draggingId === todo.id ? "ring-2 ring-purple-400" : ""}`}
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
          <input
            type="text"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Enter your prompt..."
            className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg 
                       text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 
                       focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm"
          />
          <button
            onClick={handleGenerateTodo}
            disabled={isGeneratingTodo}
            className={`px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 
                     hover:to-blue-700 text-white rounded-lg font-medium transition-all transform 
                     hover:scale-105 active:scale-95 shadow-lg hover:shadow-cyan-500/25 
                     border border-cyan-500/30 backdrop-blur-sm
                     ${isGeneratingTodo ? 'opacity-50 cursor-not-allowed scale-100 hover:scale-100' : ''}`}
          >
            <span className="flex items-center gap-2 text-nowrap">
              {isGeneratingTodo ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  ✨ Generate Todo
                </>
              )}
            </span>
          </button>
          <button
            onClick={handleAnalyzeTodo}
            disabled={isAnalyzingTodo || todos.length === 0}
            className={`px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 
                     hover:to-pink-700 text-white rounded-lg font-medium transition-all transform 
                     hover:scale-105 active:scale-95 shadow-lg hover:shadow-purple-500/25 
                     border border-purple-500/30 backdrop-blur-sm
                     ${isAnalyzingTodo || todos.length === 0 ? 'opacity-50 cursor-not-allowed scale-100 hover:scale-100' : ''}`}
          >
            <span className="flex items-center gap-2 text-nowrap">
              {isAnalyzingTodo ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  🔍 Analyze Todo
                </>
              )}
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

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border border-purple-500/30 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Dialog Header */}
            <div className="p-6 border-b border-purple-500/30">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                🤖 AI Improved Todo List
              </h2>
              <p className="text-purple-200/70 text-sm mt-1">
                Review the AI-suggested improvements to your todo list
              </p>
            </div>

            {/* Dialog Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Todos */}
                <div>
                  <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    Current Todos ({todos.length})
                  </h3>
                  <div className="space-y-2">
                    {todos.map((todo, index) => (
                      <div
                        key={todo.id}
                        className="p-3 bg-white/5 border border-purple-500/20 rounded-lg"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-purple-400 text-sm font-medium">{index + 1}.</span>
                          <p className="text-white text-sm flex-1">{todo.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Improved Todos */}
                <div>
                  <h3 className="text-lg font-semibold text-green-300 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Improved Todos ({improvedTodos.length})
                  </h3>
                  <div className="space-y-2">
                    {improvedTodos.map((todo, index) => (
                      <div
                        key={todo.id}
                        className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-green-400 text-sm font-medium">{index + 1}.</span>
                          <p className="text-white text-sm flex-1">{todo.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="p-6 border-t border-purple-500/30 flex justify-end gap-4">
              <button
                onClick={handleRejectImprovedTodos}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveImprovedTodos}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              >
                ✓ Approve & Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Todo() {

  return (
    <TodoComponent />
  )
}