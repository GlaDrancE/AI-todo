"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { User, Target, Heart, Save, Sparkles, Mail, Calendar, FileText } from "lucide-react";
import { ContextFile } from "@/prisma/generated/prisma/client";

interface UserProfile {
    whoIAm: string;
    whatIWantToAchieve: string;
    whatIWantInLife: string;
}

export default function SettingsPage() {
    const { user, isLoaded } = useUser();
    const [profile, setProfile] = useState<UserProfile>({
        whoIAm: "",
        whatIWantToAchieve: "",
        whatIWantInLife: "",
    });
    const [contextFiles, setContextFiles] = useState<ContextFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (isLoaded && user) {
            fetchProfile();
        }
    }, [isLoaded, user]);

    const fetchProfile = async () => {
        try {
            const response = await fetch("/api/profile");
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setProfile({
                        whoIAm: data.whoIAm || "",
                        whatIWantToAchieve: data.whatIWantToAchieve || "",
                        whatIWantInLife: data.whatIWantInLife || "",
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    };

    const handleSave = async () => {
        if (isLoading) return;

        setIsLoading(true);
        setIsSaved(false);

        try {
            const response = await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profile),
            });

            if (response.ok) {
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 3000);
            }
        } catch (error) {
            console.error("Error saving profile:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-purple-300">Loading...</div>
            </div>
        );
    }

    const handleContextFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const formData = new FormData();
                formData.append("file", file);
                const response = await fetch("/api/context-files", {
                    method: "POST",
                    body: formData,
                });
                if (response.ok) {
                    const data = await response.json();
                    setContextFiles([...contextFiles, data]);
                }
                else {
                    console.error("Error uploading context file:", response.statusText);
                }
            }
            catch (error) {
                console.error("Error uploading context file:", error);
            }
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden">
            <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2 animate-glow">
                        Personal Settings
                    </h1>
                    <p className="text-purple-200/70">Define who you are and what you seek</p>
                </div>

                {/* User Info Card */}
                <div className="cosmic-card p-6 mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative">
                            {user?.imageUrl ? (
                                <img
                                    src={user.imageUrl}
                                    alt={user.fullName || "User"}
                                    className="w-20 h-20 rounded-full border-2 border-purple-500/50"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                                    <User className="w-10 h-10 text-white" />
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-slate-900"></div>
                        </div>

                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white mb-1">
                                {user?.fullName || user?.username || "Anonymous"}
                            </h2>
                            <div className="flex flex-col gap-1">
                                {user?.primaryEmailAddress && (
                                    <div className="flex items-center gap-2 text-purple-300/80 text-sm">
                                        <Mail className="w-4 h-4" />
                                        <span>{user.primaryEmailAddress.emailAddress}</span>
                                    </div>
                                )}
                                {user?.createdAt && (
                                    <div className="flex items-center gap-2 text-purple-300/80 text-sm">
                                        <Calendar className="w-4 h-4" />
                                        <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-purple-500/20 pt-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-3 bg-white/5 rounded-lg">
                                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                    {(user?.publicMetadata as any)?.todoCount || 0}
                                </div>
                                <div className="text-xs text-purple-300/60">Tasks Created</div>
                            </div>
                            <div className="p-3 bg-white/5 rounded-lg">
                                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                                    {(user?.publicMetadata as any)?.completedCount || 0}
                                </div>
                                <div className="text-xs text-purple-300/60">Tasks Completed</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Personal Goals Form */}
                <div className="cosmic-card p-6 space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Sparkles className="w-6 h-6 text-purple-400" />
                        <h3 className="text-xl font-semibold text-white">Your Personal Journey</h3>
                    </div>

                    {/* Who I Am */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-purple-200 font-medium">
                            <User className="w-5 h-5 text-cyan-400" />
                            Who am I?
                        </label>
                        <textarea
                            value={profile.whoIAm}
                            onChange={(e) => setProfile({ ...profile, whoIAm: e.target.value })}
                            placeholder="Describe yourself, your identity, your values, and what makes you unique..."
                            rows={4}
                            className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg 
                       text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 
                       focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm
                       resize-none"
                        />
                    </div>

                    {/* What I Want to Achieve */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-purple-200 font-medium">
                            <Target className="w-5 h-5 text-pink-400" />
                            What do I want to achieve?
                        </label>
                        <textarea
                            value={profile.whatIWantToAchieve}
                            onChange={(e) => setProfile({ ...profile, whatIWantToAchieve: e.target.value })}
                            placeholder="Share your goals, ambitions, milestones you want to reach, and dreams you want to fulfill..."
                            rows={4}
                            className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg 
                       text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 
                       focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm
                       resize-none"
                        />
                    </div>

                    {/* What I Want in Life */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-purple-200 font-medium">
                            <Heart className="w-5 h-5 text-red-400" />
                            What do I actually want with my life?
                        </label>
                        <textarea
                            value={profile.whatIWantInLife}
                            onChange={(e) => setProfile({ ...profile, whatIWantInLife: e.target.value })}
                            placeholder="Express your deepest desires, the life you envision, what truly matters to you, and your purpose..."
                            rows={4}
                            className="w-full px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg 
                       text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 
                       focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm
                       resize-none"
                        />
                    </div>

                    {/* Save Button */}
                    <div className="pt-4">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className={`w-full px-6 py-3 rounded-lg font-medium transition-all transform 
                       hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2
                       ${isSaved
                                    ? "bg-gradient-to-r from-green-600 to-emerald-600"
                                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                }
                       text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <Save className="w-5 h-5" />
                            {isLoading ? "Saving..." : isSaved ? "Saved!" : "Save Changes"}
                        </button>
                    </div>
                </div>

                {/* Inspirational Quote */}
                <div className="mt-8 text-center">
                    <p className="text-purple-300/60 text-sm italic">
                        "The only impossible journey is the one you never begin." - Tony Robbins
                    </p>
                </div>


                {/* Context Files */}
                <div className="mt-8">
                    <h2 className="text-2xl font-semibold text-white mb-4">Your Context Files</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {contextFiles.map((file) => (
                            <>
                                <div key={file.id} className="cosmic-card p-4">
                                    <h3 className="text-lg font-semibold text-white mb-2">{file.name}</h3>
                                </div>
                            </>
                        ))}
                    </div>
                </div>

                <div className="cosmic-card p-6 space-y-4">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <FileText className="w-6 h-6 text-purple-400" />
                        Context Files
                    </h3>
                    <p className="text-purple-300/70 text-sm">
                        Upload files that provide context about your goals, progress, projects, etc.
                        The AI will use these to generate relevant todos.
                    </p>

                    <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,image/*"
                        onChange={handleContextFileUpload}
                        className="..."
                    />

                    {/* List existing context files */}
                    <div className="space-y-2">
                        {contextFiles.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <div>
                                    <p className="text-white">{file.name}</p>
                                    <p className="text-xs text-purple-400/60">
                                        {file.extractedText?.substring(0, 100)}...
                                    </p>
                                </div>
                                {/* <button onClick={() => deleteFile(file.id)}>Delete</button> */}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}