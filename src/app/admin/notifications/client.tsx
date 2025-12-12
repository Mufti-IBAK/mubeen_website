"use client";
// Notifications feature removed

import React, { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "announcement";
  priority: "low" | "normal" | "high" | "urgent";
  action_label?: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

interface User {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
}

export default function NotificationsClient() {
  const [activeTab, setActiveTab] = useState<
    "compose" | "templates" | "history"
  >("compose");
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Compose form state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [broadcastType, setBroadcastType] = useState<
    "all" | "students" | "admins" | "selected"
  >("all");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "info" | "success" | "warning" | "error" | "announcement"
  >("info");
  const [notificationPriority, setNotificationPriority] = useState<
    "low" | "normal" | "high" | "urgent"
  >("normal");
  const [actionLabel, setActionLabel] = useState("");
  const [actionUrl, setActionUrl] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load templates
      const { data: templatesData } = await supabase
        .from("notification_templates")
        .select("*")
        .order("created_at", { ascending: false });

      setTemplates(templatesData || []);

      // Load users (profiles with auth users)
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .order("full_name", { ascending: true });

      setUsers(usersData || []);
    } catch (error) {
      console.error("Error loading notification data:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      alert("Please fill in title and message");
      return;
    }

    setSending(true);
    try {
      if (
        broadcastType === "all" ||
        broadcastType === "students" ||
        broadcastType === "admins"
      ) {
        // Send broadcast notification
        const { error } = await supabase.rpc(
          "send_broadcast_notification",
          {
            p_title: notificationTitle,
            p_message: notificationMessage,
            p_type: notificationType,
            p_priority: notificationPriority,
            p_broadcast_role:
              broadcastType === "all"
                ? null
                : broadcastType === "students"
                ? "student"
                : "admin",
            p_action_url: actionUrl || null,
            p_action_label: actionLabel || null,
          }
        );

        if (error) throw error;
      } else if (broadcastType === "selected" && selectedUsers.length > 0) {
        // Send individual notifications
        const promises = selectedUsers.map((userId) =>
          supabase.rpc("send_notification", {
            p_recipient_id: userId,
            p_title: notificationTitle,
            p_message: notificationMessage,
            p_type: notificationType,
            p_priority: notificationPriority,
            p_action_url: actionUrl || null,
            p_action_label: actionLabel || null,
          })
        );

        await Promise.all(promises);
      }

      // Reset form
      setNotificationTitle("");
      setNotificationMessage("");
      setActionLabel("");
      setActionUrl("");
      setSelectedUsers([]);

      alert("Notification sent successfully!");
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Failed to send notification. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template: NotificationTemplate) => {
    setNotificationTitle(template.title);
    setNotificationMessage(template.message);
    setNotificationType(template.type);
    setNotificationPriority(template.priority);
    setActionLabel(template.action_label || "");
    setActiveTab("compose");
    // Explicitly set broadcast type to all when applying template if not selected
    if (broadcastType === "selected") setBroadcastType("all"); 
  };

  const typeColors = {
    info: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    announcement: "bg-purple-100 text-purple-800",
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-600",
    normal: "bg-blue-100 text-blue-600",
    high: "bg-orange-100 text-orange-600",
    urgent: "bg-red-100 text-red-600",
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: "compose", label: "Compose" },
          { key: "templates", label: "Templates" },
          { key: "history", label: "History" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === key
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Compose Tab */}
      {activeTab === "compose" && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            Compose Notification
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipients
                </label>
                <div className="space-y-2">
                  {[
                    { key: "all", label: "All Users" },
                    { key: "students", label: "Students Only" },
                    { key: "admins", label: "Admins Only" },
                    { key: "selected", label: "Selected Users" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="broadcastType"
                        value={key}
                        checked={broadcastType === key}
                        onChange={(e) =>
                          setBroadcastType(e.target.value as any)
                        }
                        className="text-blue-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* User Selection */}
              {broadcastType === "selected" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Users ({selectedUsers.length} selected)
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    {users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(
                                selectedUsers.filter((id) => id !== user.id)
                              );
                            }
                          }}
                          className="text-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {user.full_name || "Unnamed User"}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            user.role === "admin"
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {user.role || "student"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Type and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={notificationType}
                    onChange={(e) => setNotificationType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="announcement">Announcement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={notificationPriority}
                    onChange={(e) =>
                      setNotificationPriority(e.target.value as any)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Enter notification title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Enter notification message..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Button (Optional) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                    placeholder="e.g., View Course"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="/dashboard"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Send Button */}
              <button
                onClick={sendNotification}
                disabled={sending}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    Send Notification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Notification Templates
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        typeColors[template.type]
                      }`}
                    >
                      {template.type}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        priorityColors[template.priority]
                      }`}
                    >
                      {template.priority}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-800 mb-1">
                  {template.title}
                </p>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.message}
                </p>
                {template.variables.length > 0 && (
                  <p className="text-xs text-blue-600 mb-3">
                    Variables: {template.variables.join(", ")}
                  </p>
                )}
                <button
                  onClick={() => applyTemplate(template)}
                  className="w-full text-sm bg-blue-50 text-blue-600 py-1 px-3 rounded hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            Notification History
          </h2>
          <p className="text-gray-600">
            Notification history will be implemented in the next phase.
          </p>
        </div>
      )}
    </div>
  );
}
