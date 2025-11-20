import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Bell, CheckCircle, AlertCircle, Info, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  reminder: Clock
};

const typeColors = {
  info: "bg-blue-100 text-blue-600",
  success: "bg-green-100 text-green-600",
  warning: "bg-amber-100 text-amber-600",
  reminder: "bg-purple-100 text-purple-600"
};

export default function NotificationsPanel({ 
  notifications, 
  onClose, 
  onClearAll, 
  onMarkAsRead,
  onNotificationClick 
}) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.2 }}
      className="fixed left-4 top-20 w-[calc(100%-2rem)] md:w-96 bg-white rounded-2xl shadow-2xl z-50 flex flex-col max-h-[80vh] overflow-hidden"
      dir="rtl"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">התראות</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-blue-100">{unreadCount} התראות חדשות</p>
            )}
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Clear All Button */}
      {notifications.length > 0 && (
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="w-full gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          >
            <Trash2 className="w-4 h-4" />
            מחק את כל ההתראות
          </Button>
        </div>
      )}

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Info;
                const colorClass = typeColors[notification.type] || typeColors.info;
                
                return (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50/30' : ''
                    }`}
                    onClick={() => {
                      onMarkAsRead(notification.id);
                      if (notification.action_url) {
                        onNotificationClick(notification);
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`font-semibold text-gray-900 ${
                            !notification.read ? 'font-bold' : ''
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-gray-400">
                          {format(new Date(notification.created_date), "d בMMMM, HH:mm", { locale: he })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Bell className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              אין התראות חדשות
            </h3>
            <p className="text-sm text-gray-500">
              כל ההתראות שלך יופיעו כאן
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}