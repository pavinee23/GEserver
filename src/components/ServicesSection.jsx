export default function ServicesSection({ ui, services }) {
  const SERVICE_ICONS = {
    "บริการดูแลระบบ": "🛡️",
    "บริการเช่าโดเมนรายปี": "🌐",
    "บริการยิงแอด": "📣",
    "บริการออกแบบหน้าเว็บ": "🎨",
    "บริการพัฒนาระบบ": "⚙️",
    "บริการอื่นๆ": "✨",
    "พัฒนาระบบเฉพาะธุรกิจ": "💻",
    "เชื่อมต่อฐานข้อมูลและรายงาน": "🗄️",
    "ดูแลเซิร์ฟเวอร์และสิทธิ์การใช้งาน": "🔐",
  };
  const FALLBACK_ICONS = ["🛡️","🌐","📣","🎨","⚙️","✨"];
  return (
    <section className="agency-section agency-section-plain" id="services">
      <div className="container-xxl agency-shell">
        <div className="agency-section-shell agency-section-shell-soft">
          <div className="section-intro text-center" data-reveal>
            <span className="section-kicker">{ui.servicesKicker}</span>
            <h2 className="section-title">{ui.servicesTitle}</h2>
            <p className="section-subtitle">{ui.servicesSubtitle}</p>
          </div>

          <div className="row g-4">
            {services.map((service, index) => (
              <div key={service.id || service.title} className="col-12 col-md-6 col-xl-4">
                <article
                  data-reveal
                  data-delay={index + 1}
                  className={`agency-service-card ${index === 1 ? "agency-service-card-featured" : ""}`}
                >
                  <div className="service-badge">{String(index + 1).padStart(2, "0")}</div>
                  <div className="service-icon-ring">{service.icon || SERVICE_ICONS[service.title] || FALLBACK_ICONS[index] || "⭐"}</div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <span className="service-highlight">{service.highlight}</span>
                </article>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
