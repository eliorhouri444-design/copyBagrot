
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Crown, 
  Check, 
  X, 
  Sparkles, 
  ChevronLeft,
  Infinity,
  Target,
  Shield,
  Calendar,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PremiumPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    cardName: "",
    expiry: "",
    cvv: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      let retries = 3;
      while (retries > 0) {
        try {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
          setIsUserLoaded(true);
          return;
        } catch (error) {
          console.error(`Error loading user (retries left: ${retries - 1}):`, error);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      console.warn("Failed to load user after retries, showing premium page anyway");
      setIsUserLoaded(true);
    };
    loadUser();
  }, []);

  const plans = [
    {
      id: "monthly",
      name: "מנוי חודשי",
      price: 49.99,
      period: "לחודש",
      color: "from-blue-500 to-indigo-600",
      features: [
        "כל התכונות של פרימיום",
        "ביטול בכל עת",
        "תמיכה מלאה 24/7",
        "עדכונים שוטפים"
      ]
    },
    {
      id: "yearly",
      name: "מנוי שנתי",
      price: 299.94,
      originalPrice: 599.88,
      discount: 50,
      period: "לשנה",
      color: "from-amber-500 to-orange-600",
      badge: "הכי משתלם",
      savingsText: "חסוך 300₪ לשנה!",
      features: [
        "כל התכונות של פרימיום",
        "חיסכון של 50% - רק 300₪ לשנה",
        "תמיכה מלאה 24/7",
        "עדכונים שוטפים",
        "גישה מוקדמת לתכונות חדשות"
      ]
    }
  ];

  const premiumFeatures = [
    {
      icon: Infinity,
      title: "אלפי שאלות",
      description: "גישה מלאה למאגר עצום של שאלות, תרגולים ופתרונות בכל מקצועות הבגרות.",
      free: "עד 100 שאלות בלבד",
      premium: "גישה מלאה ללא הגבלה",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Target,
      title: "מאות בחנים ומבחנים אמיתיים",
      description: "תרגול לפי נושא, לפי רמה, מבחני סימולציה מדויקים כמו בבגרות.",
      free: "עשרות בחנים בלבד",
      premium: "מאות בחנים מלאים",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Shield,
      title: "אין פרסומות",
      description: "כל הלמידה נקייה, מהירה וללא הסחות דעת.",
      free: "פרסומות במבחנים",
      premium: "ללא פרסומות כלל",
      gradient: "from-amber-500 to-yellow-500"
    }
  ];

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowPlanDialog(false);
    setShowPaymentDialog(true);
  };

  const handlePayment = async () => {
    if (!paymentDetails.cardNumber || !paymentDetails.cardName || !paymentDetails.expiry || !paymentDetails.cvv) {
      alert("אנא מלא את כל הפרטים");
      return;
    }

    try {
      await base44.auth.updateMe({
        is_premium: true,
        subscription_type: selectedPlan.id
      });

      alert(`🎉 תשלום התקבל!\n\nמסלול: ${selectedPlan.name}\nמחיר: ${selectedPlan.price}₪\n\nהמנוי שלך הופעל בהצלחה!`);
      setShowPaymentDialog(false);
      setPaymentDetails({ cardNumber: "", cardName: "", expiry: "", cvv: "" });
      
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      
    } catch (error) {
      console.error("Error:", error);
      alert("שגיאה בעדכון המנוי");
    }
  };

  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-purple-50 pb-4">
      {/* Header - גודל זהה לכל הדפים */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`${user?.is_premium ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-amber-500 to-yellow-500'} rounded-b-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
        
        <div className="relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Home"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <Crown className="w-10 h-10 text-white" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white mb-2"
            >
              {user?.is_premium ? '🎉 משודרג לפרימיום' : 'שדרגו לפרימיום'}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-base text-white/90"
            >
              {user?.is_premium ? 'תהנה מכל היכולות המתקדמות' : 'ללמוד חכם יותר, להצליח יותר'}
            </motion.p>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-6 pb-4">
        {user?.is_premium ? (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-green-50 rounded-2xl shadow-lg p-6 text-center border-2 border-green-200"
            >
              <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">ברוך הבא למשפחת הפרימיום!</h2>
              <p className="text-gray-700 text-lg">
                המנוי שלך פעיל ואתה נהנה מכל היתרונות של פרימיום.
              </p>
              <p className="text-gray-600 text-sm mt-4">
                סוג מנוי: {user?.subscription_type === 'yearly' ? 'שנתי' : 'חודשי'}
              </p>
            </motion.div>

            {/* Optionally, display more info or link to settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                מה עכשיו?
              </h3>
              <p className="text-gray-700 mb-4">
                התחל לנצל את כל התכונות המתקדמות. עכשיו יש לך גישה ל:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>אלפי שאלות ותרגולים ללא הגבלה.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>מאות בחנים ומבחנים אמיתיים.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>חווית למידה ללא פרסומות.</span>
                </li>
              </ul>
              <Button
                onClick={() => navigate(createPageUrl("Home"))}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-bold rounded-xl"
              >
                חזור לדף הבית
              </Button>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Pricing Section */}
            <div className="mb-16">
              <div className="text-center mb-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-xl mb-3 shadow-lg">
                    <Sparkles className="w-6 h-6" />
                    בחר את המסלול שלך
                  </div>
                  <p className="text-gray-600 text-base">מסלול אחד, כל התכונות</p>
                </motion.div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                {plans.map((plan, idx) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                    className={`relative bg-white rounded-3xl shadow-2xl p-8 border-4 ${plan.id === 'yearly' ? 'border-amber-400' : 'border-gray-200'} flex flex-col items-center text-center`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                        {plan.badge}
                      </div>
                    )}
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gradient-to-r ${plan.color}`}>
                      <Crown className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-500 mb-4 text-base">
                      {plan.id === 'yearly' && plan.originalPrice && (
                        <span className="line-through text-gray-400 mr-2">{plan.originalPrice}₪</span>
                      )}
                      <span className="text-4xl font-extrabold text-gray-900">
                        {plan.price}₪
                      </span>
                      <span className="text-xl text-gray-600">/{plan.period}</span>
                    </p>
                    {plan.savingsText && (
                      <p className="text-green-600 font-semibold mb-6 text-sm">{plan.savingsText}</p>
                    )}

                    <ul className="text-gray-700 space-y-3 text-right w-full mb-8">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-center justify-end gap-3 text-base">
                          <span>{feature}</span>
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      className={`mt-auto w-full py-3 h-auto text-lg font-bold rounded-xl ${plan.id === 'yearly' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                    >
                      בחר מסלול
                    </Button>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center mt-8"
              >
                <div className="inline-flex items-center gap-2 bg-amber-50 border-2 border-amber-200 rounded-full px-6 py-3">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-900 font-semibold">
                    מנוי שנתי = רק <span className="text-amber-600 font-bold">25₪ לחודש</span> במקום 49.99₪
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Features Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mb-12"
            >
              <div className="text-center mb-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-xl mb-3 shadow-lg">
                    <Target className="w-6 h-6" />
                    מה מקבלים בפרימיום?
                  </div>
                  <p className="text-gray-600 text-base">כל הכלים שתצטרך כדי להצליח</p>
                </motion.div>
              </div>
              
              <div className="space-y-6">
                {premiumFeatures.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + idx * 0.05 }}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                    >
                      <div className={`bg-gradient-to-r ${feature.gradient} p-5`}>
                        <div className="flex items-center gap-4 text-white">
                          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                            <Icon className="w-7 h-7" />
                          </div>
                          <h3 className="text-xl font-bold flex-1">{feature.title}</h3>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <p className="text-gray-700 leading-relaxed mb-6">{feature.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                            <div className="flex items-center gap-2 mb-2">
                              <X className="w-5 h-5 text-red-600" />
                              <span className="text-sm font-bold text-red-900">בחינם</span>
                            </div>
                            <p className="text-sm text-red-700">{feature.free}</p>
                          </div>
                          
                          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Check className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-bold text-green-900">פרימיום</span>
                            </div>
                            <p className="text-sm text-green-700">{feature.premium}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 }}
              className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-12 text-center text-white shadow-2xl"
            >
              <Crown className="w-24 h-24 mx-auto mb-6" />
              <h2 className="text-4xl font-bold mb-4">מוכן לקפוץ לרמה הבאה?</h2>
              <p className="text-white/90 mb-8 text-xl max-w-2xl mx-auto">
                הצטרף לאלפי תלמידים שכבר משתמשים בפרימיום ומשפרים את הציונים שלהם
              </p>
              
              <div className="flex justify-center">
                <Button
                  onClick={() => setShowPlanDialog(true)} 
                  className="bg-white text-amber-600 px-10 py-2 text-lg font-bold opacity-100 rounded-2xl inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-100 h-14 shadow-2xl"
                >
                  <Crown className="w-5 h-5 ml-2" />
                  שדרג לפרימיום עכשיו
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </div>

      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="sm:max-w-[425px] p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-4">בחר תוכנית פרימיום</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl shadow-md p-5 border-2 ${selectedPlan?.id === plan.id ? 'border-amber-500' : 'border-gray-200'} cursor-pointer hover:border-amber-500 transition-all`}
                onClick={() => setSelectedPlan(plan)}
              >
                {plan.badge && (
                  <div className="absolute -top-3 right-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}
                <h4 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h4>
                <p className="text-gray-600 text-lg">
                  <span className="font-extrabold text-2xl">{plan.price}₪</span>/{plan.period}
                  {plan.originalPrice && (
                    <span className="line-through text-gray-400 text-base mr-2">{plan.originalPrice}₪</span>
                  )}
                </p>
                {plan.savingsText && (
                  <p className="text-green-600 font-semibold text-sm mt-1">{plan.savingsText}</p>
                )}
                <ul className="text-gray-700 space-y-1 text-right mt-3 text-sm">
                  {plan.features.slice(0, 2).map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-center justify-end gap-2">
                      <span>{feature}</span>
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <DialogFooter className="mt-6 flex flex-col sm:flex-col gap-2">
            <Button
              onClick={() => handleSelectPlan(selectedPlan)}
              disabled={!selectedPlan}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 text-lg font-bold rounded-xl"
            >
              המשך לתשלום
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setShowPlanDialog(false); setSelectedPlan(null); }}
              className="w-full text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[425px] p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-4">תשלום עבור {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-amber-50 rounded-lg p-3 text-amber-800 border border-amber-200">
              <span className="font-semibold text-lg">{selectedPlan?.name}</span>
              <span className="font-bold text-xl">{selectedPlan?.price}₪</span>
            </div>

            <div className="space-y-2">
              <label htmlFor="card-number" className="block text-sm font-medium text-gray-700 text-right">מספר כרטיס</label>
              <div className="relative">
                <Input
                  id="card-number"
                  placeholder="XXXX XXXX XXXX XXXX"
                  value={paymentDetails.cardNumber}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value })}
                  className="text-right pr-10"
                />
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="card-name" className="block text-sm font-medium text-gray-700 text-right">שם בעל הכרטיס</label>
              <Input
                id="card-name"
                placeholder="כמו שמופיע על הכרטיס"
                value={paymentDetails.cardName}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, cardName: e.target.value })}
                className="text-right"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 text-right">תאריך תפוגה</label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={paymentDetails.expiry}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, expiry: e.target.value })}
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 text-right">CVV</label>
                <Input
                  id="cvv"
                  type="password"
                  placeholder="XXX"
                  value={paymentDetails.cvv}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })}
                  className="text-right"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6 flex flex-col sm:flex-col gap-2">
            <Button
              onClick={handlePayment}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 text-lg font-bold rounded-xl"
            >
              <CreditCard className="w-5 h-5 ml-2" />
              בצע תשלום
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowPaymentDialog(false)}
              className="w-full text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
