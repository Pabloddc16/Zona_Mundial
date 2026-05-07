import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Pablo App',
}

export default function TerminosPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 prose prose-sm text-tinta">
      <Link href="/" className="text-verde text-sm font-medium mb-6 block">← Volver</Link>

      <h1 className="text-2xl font-black text-tinta">Términos y Condiciones</h1>
      <p className="text-gray-500 text-sm">Última actualización: 7 de mayo de 2026</p>

      <h2>1. Aceptación</h2>
      <p>
        Al utilizar Pablo App, usted acepta estos Términos y Condiciones. Si no está de acuerdo, no utilice la aplicación.
      </p>

      <h2>2. Descripción del servicio</h2>
      <p>
        Pablo App es una plataforma para el seguimiento de estampas Panini del Mundial 2026 y la compra de productos relacionados
        (sobres, álbumes, artículos del Mundial). El servicio de ventas opera en México y zonas de entrega disponibles.
      </p>

      <h2>3. Pedidos y pagos</h2>
      <ul>
        <li>Los precios están expresados en pesos mexicanos (MXN) e incluyen IVA cuando aplique.</li>
        <li>Pablo App se reserva el derecho de rechazar o cancelar pedidos en caso de error en el precio, falta de inventario o sospecha de fraude.</li>
        <li>El pago puede realizarse en efectivo, transferencia bancaria o tarjeta según disponibilidad.</li>
        <li>Los pagos con tarjeta son procesados por terceros (Mercado Pago, Stripe) y no almacenamos datos de tarjeta.</li>
      </ul>

      <h2>4. Envíos y entregas</h2>
      <ul>
        <li>Los tiempos de entrega son estimados y pueden variar por factores externos.</li>
        <li>El costo de envío se indica durante el proceso de compra.</li>
        <li>Pablo App no es responsable por retrasos causados por terceros (paqueterías, condiciones climáticas, etc.).</li>
      </ul>

      <h2>5. Devoluciones</h2>
      <p>
        Aceptamos devoluciones de productos en perfecto estado dentro de los 7 días hábiles posteriores a la entrega.
        Los sobres abiertos no son elegibles para devolución. Para iniciar una devolución, contáctenos vía WhatsApp o correo.
      </p>

      <h2>6. Álbum digital</h2>
      <p>
        El álbum de estampas digital es una herramienta de seguimiento personal. Los datos se almacenan en su dispositivo.
        Pablo App no garantiza la disponibilidad permanente del servicio y no es responsable por pérdida de datos locales.
      </p>

      <h2>7. Propiedad intelectual</h2>
      <p>
        Las imágenes de estampas, álbumes y productos Panini son propiedad de Panini S.p.A. Pablo App no tiene afiliación
        oficial con Panini o la FIFA. Las imágenes de productos se usan únicamente con fines informativos.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        Pablo App no será responsable por daños indirectos, incidentales o consecuentes derivados del uso o imposibilidad de
        uso del servicio. La responsabilidad total no excederá el monto pagado por el pedido específico en disputa.
      </p>

      <h2>9. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier disputa se someterá a la jurisdicción
        de los tribunales competentes en México.
      </p>

      <h2>10. Contacto</h2>
      <p>
        Para dudas sobre estos términos, escríbanos vía WhatsApp o al correo electrónico de atención al cliente disponible en la app.
      </p>
    </div>
  )
}
