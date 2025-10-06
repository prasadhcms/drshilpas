import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import logoUrl from '../assets/drshilpas-logo.png'
import heroBgImage from '../assets/bg-hero-dr-shilpas-clinic.jpg'

export default function Home() {
  const [expandedCard, setExpandedCard] = useState(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const services = [
    {
      id: 'general',
      title: 'General Dentistry',
      shortDesc: 'Routine check-ups, cleanings, fillings, and preventive care',
      details: 'Our general dentistry services include comprehensive oral examinations, professional teeth cleaning, dental fillings, fluoride treatments, and preventive care to maintain your oral health. We use digital X-rays for accurate diagnosis and provide personalized treatment plans.',
      features: ['Comprehensive oral exams', 'Professional cleaning', 'Digital X-rays', 'Preventive treatments', 'Fillings & restorations']
    },
    {
      id: 'cosmetic',
      title: 'Cosmetic Dentistry',
      shortDesc: 'Teeth whitening, veneers, and smile makeovers',
      details: 'Transform your smile with our cosmetic dentistry services. We offer professional teeth whitening, porcelain veneers, dental bonding, and complete smile makeovers. Our treatments are designed to enhance both the appearance and function of your teeth.',
      features: ['Professional whitening', 'Porcelain veneers', 'Dental bonding', 'Smile makeovers', 'Tooth contouring']
    },
    {
      id: 'orthodontics',
      title: 'Orthodontics',
      shortDesc: 'Braces and aligners for straighter, healthier smiles',
      details: 'Achieve a perfectly aligned smile with our orthodontic treatments. We offer traditional braces, clear ceramic braces, and clear aligner therapy. Our orthodontists create customized treatment plans to address various alignment issues and bite problems.',
      features: ['Traditional braces', 'Clear ceramic braces', 'Clear aligners', 'Bite correction', 'Retainer therapy']
    },
    {
      id: 'implants',
      title: 'Dental Implants',
      shortDesc: 'Permanent tooth replacement solutions',
      details: 'Replace missing teeth with our advanced dental implant solutions. We provide single tooth implants, implant-supported bridges, and full arch restorations. Our implants are made from high-quality materials and designed for long-term success.',
      features: ['Single tooth implants', 'Implant bridges', 'All-on-4 treatment', 'Bone grafting', 'Implant maintenance']
    },
    {
      id: 'emergency',
      title: 'Emergency Care',
      shortDesc: 'Urgent dental treatment when you need it most',
      details: 'Dental emergencies can happen anytime. We provide prompt emergency dental care for toothaches, broken teeth, lost fillings, and other urgent situations. Our team is equipped to handle emergencies with compassion and expertise.',
      features: ['Toothache relief', 'Broken tooth repair', 'Lost filling replacement', 'Emergency extractions', 'Infection treatment']
    },
    {
      id: 'pediatric',
      title: 'Pediatric Dentistry',
      shortDesc: 'Specialized dental care for children of all ages',
      details: 'We create a fun, comfortable environment for our young patients. Our pediatric dentistry services include preventive care, early orthodontic intervention, cavity treatment, and education on proper oral hygiene habits for children.',
      features: ['Child-friendly environment', 'Preventive care', 'Early orthodontics', 'Cavity prevention', 'Oral hygiene education']
    }
  ]

  const toggleCard = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId)
  }

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section
        className="relative text-white bg-cover bg-center bg-no-repeat min-h-[500px]"
        style={{ backgroundImage: `linear-gradient(to bottom right, rgba(40, 116, 186, 0.6), rgba(59, 130, 246, 0.5)), url(${heroBgImage})` }}
      >
        <div className="max-w-[1360px] mx-auto px-6 py-16 flex items-center min-h-[500px]">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white rounded-full p-5 shadow-lg mb-6 inline-flex items-center justify-center w-32 h-32">
              <img src={logoUrl} alt="Dr. Shilpa's Clinic" className="h-24 w-auto" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Dr. Shilpa's Dental Clinic
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl">
              Your trusted partner in dental health. We provide comprehensive dental care with modern technology and personalized treatment plans.
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 bg-white">
        <div className="max-w-[1360px] mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              About Dr. Shilpa's Clinic
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              With years of experience in dentistry, Dr. Shilpa's Clinic has been providing exceptional dental care to patients of all ages. We combine advanced dental technology with a gentle, caring approach to ensure your comfort and satisfaction.
            </p>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="bg-[#2874ba] text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  🦷
                </div>
                <h3 className="text-xl font-semibold mb-2">Expert Care</h3>
                <p className="text-gray-600">Professional dental services with the latest techniques and equipment</p>
              </div>
              <div className="text-center">
                <div className="bg-[#2874ba] text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  💙
                </div>
                <h3 className="text-xl font-semibold mb-2">Patient Comfort</h3>
                <p className="text-gray-600">Creating a comfortable, stress-free environment for all patients</p>
              </div>
              <div className="text-center">
                <div className="bg-[#2874ba] text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  📅
                </div>
                <h3 className="text-xl font-semibold mb-2">Easy Scheduling</h3>
                <p className="text-gray-600">Convenient appointment booking and management system</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 bg-gray-50">
        <div className="max-w-[1360px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We offer a comprehensive range of dental services to meet all your oral health needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {services.map((service) => (
              <div key={service.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCard(service.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-[#2874ba]">{service.title}</h3>
                    <span className={`text-2xl transition-transform duration-200 ${expandedCard === service.id ? 'rotate-45' : ''}`}>
                      +
                    </span>
                  </div>
                  <p className="text-gray-600">{service.shortDesc}</p>
                </div>

                <div className={`px-6 pb-6 transition-all duration-300 ease-in-out overflow-hidden ${
                  expandedCard === service.id ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="border-t pt-4">
                    <p className="text-gray-700 mb-4">{service.details}</p>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900">Services include:</h4>
                      <ul className="space-y-1">
                        {service.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-gray-600">
                            <span className="text-[#2874ba] mr-2">•</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download App Section */}
      <section id="download" className="py-16 bg-white">
        <div className="max-w-[1360px] mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              Download Our Mobile App
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Manage your appointments, view your dental history, and stay connected with our clinic through our convenient mobile application.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="bg-gray-900 text-white px-6 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 transition-colors">
                <div className="text-2xl">📱</div>
                <div className="text-left">
                  <div className="text-xs text-gray-300">Download on the</div>
                  <div className="font-semibold">App Store</div>
                </div>
              </button>
              <button className="bg-gray-900 text-white px-6 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 transition-colors">
                <div className="text-2xl">🤖</div>
                <div className="text-left">
                  <div className="text-xs text-gray-300">Get it on</div>
                  <div className="font-semibold">Google Play</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-[#2874ba]">
        <div className="max-w-[1360px] mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
              Contact Us
            </h2>
            <div className="grid md:grid-cols-3 gap-8 text-white">
              <div className="text-center">
                <div className="text-4xl mb-4">📍</div>
                <h3 className="text-xl font-semibold mb-2">Location</h3>
                <p className="text-blue-100">
                  123 Dental Street<br />
                  Medical District<br />
                  Your City, State 12345
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">📞</div>
                <h3 className="text-xl font-semibold mb-2">Phone</h3>
                <p className="text-blue-100">
                  +1 (555) 123-DENT<br />
                  (555) 123-3368
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">⏰</div>
                <h3 className="text-xl font-semibold mb-2">Hours</h3>
                <p className="text-blue-100">
                  Mon - Fri: 9:00 AM - 6:00 PM<br />
                  Sat: 9:00 AM - 4:00 PM<br />
                  Sun: Closed
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-[1360px] mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={logoUrl} alt="Dr. Shilpa's Clinic" className="h-8 w-8" />
            <span className="text-lg font-semibold">Dr. Shilpa's Dental Clinic</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2024 Dr. Shilpa's Dental Clinic. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-[#2874ba] text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 z-50"
          aria-label="Go to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  )
}