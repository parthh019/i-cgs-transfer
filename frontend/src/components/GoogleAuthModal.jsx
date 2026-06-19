import { useState } from 'react'
import { X, User, ShieldCheck, ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GoogleAuthModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1) // 1: Chooser, 2: Custom Form, 3: Consent
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [customName, setCustomName] = useState('')
  const [customEmail, setCustomEmail] = useState('')

  if (!isOpen) return null

  const presets = [
    { name: 'Rahul Patel', email: 'rahul.patel@gmail.com', color: 'bg-blue-600' },
    { name: 'Deepika Verma', email: 'deepika.v@gmail.com', color: 'bg-purple-600' },
    { name: 'Guest User', email: 'guest.cgs@gmail.com', color: 'bg-emerald-600' }
  ]

  const handleSelectAccount = (account) => {
    setSelectedAccount(account)
    setStep(3) // Go to consent
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    if (!customName.trim() || !customEmail.trim()) {
      toast.error('Please fill in both name and email fields.')
      return
    }
    if (!customEmail.includes('@')) {
      toast.error('Please enter a valid email address.')
      return
    }
    const account = {
      name: customName.trim(),
      email: customEmail.trim(),
      color: 'bg-amber-600'
    }
    setSelectedAccount(account)
    setStep(3)
  }

  const handleAuthorize = () => {
    const profileData = {
      name: selectedAccount.name,
      email: selectedAccount.email,
      picture: null
    }
    const token = 'mock_gmail_token'
    const expires = Date.now() + 3600 * 1000 // 1 hour expiration

    localStorage.setItem('gmail_token', token)
    localStorage.setItem('gmail_token_expires', String(expires))
    localStorage.setItem('gmail_profile', JSON.stringify(profileData))

    toast.success(`Connected as ${selectedAccount.email}!`)
    onSuccess(profileData, token)
    handleClose()
  }

  const handleClose = () => {
    setStep(1)
    setSelectedAccount(null)
    setCustomName('')
    setCustomEmail('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative bg-white text-gray-800 rounded-3xl w-full max-w-[420px] shadow-2xl overflow-hidden border border-gray-100 p-8 flex flex-col items-center">
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Google Colored Logo */}
        <div className="flex text-2xl font-bold tracking-tight mb-6 font-sans select-none">
          <span className="text-blue-500">G</span>
          <span className="text-red-500">o</span>
          <span className="text-yellow-500">o</span>
          <span className="text-blue-500">g</span>
          <span className="text-green-500">l</span>
          <span className="text-red-500">e</span>
        </div>

        {/* STEP 1: Account Chooser */}
        {step === 1 && (
          <div className="w-full text-center space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Choose an account</h2>
              <p className="text-sm text-gray-500 mt-1">to continue to CGS</p>
            </div>

            <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
              {presets.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectAccount(acc)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-left transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full ${acc.color} flex items-center justify-center text-white font-semibold text-sm`}>
                    {acc.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700 truncate">{acc.name}</p>
                    <p className="text-xs text-gray-400 truncate">{acc.email}</p>
                  </div>
                </button>
              ))}

              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-left transition-colors text-gray-600"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  <User size={15} />
                </div>
                <span className="text-sm font-medium">Use another account</span>
              </button>
            </div>
            
            <p className="text-[11px] text-gray-400 leading-normal pt-2">
              To continue, Google will share your name, email address, and profile picture with CGS.
            </p>
          </div>
        )}

        {/* STEP 2: Custom Account Form */}
        {step === 2 && (
          <div className="w-full space-y-4">
            <button 
              onClick={() => setStep(1)} 
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft size={12} /> Back to list
            </button>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 text-center">Add Mock Account</h2>
              <p className="text-xs text-gray-400 text-center mt-0.5">Enter credentials for Google selection</p>
            </div>

            <form onSubmit={handleCustomSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Smith"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Gmail Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sarah.smith@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors mt-2"
              >
                Proceed to authorize
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: Consent Screen */}
        {step === 3 && selectedAccount && (
          <div className="w-full text-center space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">CGS wants to access your Google Account</h2>
              <p className="text-xs text-gray-500 font-mono mt-1 bg-gray-50 py-1.5 px-3 rounded-lg inline-block">
                {selectedAccount.email}
              </p>
            </div>

            <div className="text-left bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-3.5 text-xs text-gray-600">
              <p className="font-semibold text-gray-700">This will allow CGS to:</p>
              
              <div className="flex gap-2.5">
                <input 
                  type="checkbox" 
                  disabled 
                  checked 
                  className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5" 
                />
                <div>
                  <p className="font-semibold text-gray-700">Send emails on your behalf</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Allows the app to deliver generated certificate PDFs via your Gmail address.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <input 
                  type="checkbox" 
                  disabled 
                  checked 
                  className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5" 
                />
                <div>
                  <p className="font-semibold text-gray-700">View profile information</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Allows CGS to display your avatar name and email address in the dashboard header.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full pt-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAuthorize}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={16} />
                Allow Access
              </button>
            </div>

            <p className="text-[10px] text-gray-400 leading-normal text-left">
              You can revoke access to this app at any time by clicking "Disconnect Account" in the Email Settings page.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
