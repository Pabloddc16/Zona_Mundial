import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aviso de Privacidad — Pablo App',
}

export default function PrivacidadPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 prose prose-sm text-tinta">
      <Link href="/" className="text-verde text-sm font-medium mb-6 block">← Volver</Link>

      <h1 className="text-2xl font-black text-tinta">Aviso de Privacidad</h1>
      <p className="text-gray-500 text-sm">Última actualización: 7 de mayo de 2026</p>

      <h2>Responsable del tratamiento de datos</h2>
      <p>
        Pablo App (en adelante «Pablo App», «nosotros» o «el responsable») es responsable del uso y protección de sus datos personales.
        Para consultas relacionadas con privacidad, contáctenos a través de nuestro correo electrónico.
      </p>

      <h2>Datos que recopilamos</h2>
      <p>Para procesar pedidos recopilamos:</p>
      <ul>
        <li><strong>Datos de contacto:</strong> nombre, número de teléfono.</li>
        <li><strong>Datos de entrega:</strong> dirección postal (solo cuando aplica envío a domicilio).</li>
        <li><strong>Datos del pedido:</strong> productos solicitados, método de pago, fecha del pedido.</li>
      </ul>
      <p>
        El álbum de estampas y el carrito de compras se almacenan <strong>localmente en su dispositivo</strong> (localStorage / MMKV) y
        no se transmiten a nuestros servidores a menos que usted realice un pedido.
      </p>
      <p>No recopilamos datos de pago directamente. Los pagos son procesados por terceros (Mercado Pago, Stripe).</p>

      <h2>Uso de los datos</h2>
      <p>Utilizamos sus datos para:</p>
      <ul>
        <li>Procesar y entregar su pedido.</li>
        <li>Contactarle vía WhatsApp para confirmar el pedido y coordinar la entrega.</li>
        <li>Cumplir con obligaciones fiscales (CFDI cuando aplique).</li>
        <li>Mejorar nuestro servicio mediante análisis agregados y anónimos.</li>
      </ul>

      <h2>Compartición de datos</h2>
      <p>No vendemos ni cedemos sus datos personales a terceros. Compartimos datos únicamente con:</p>
      <ul>
        <li><strong>Repartidores:</strong> nombre y dirección para realizar la entrega.</li>
        <li><strong>Procesadores de pago:</strong> Mercado Pago y Stripe, bajo sus propias políticas de privacidad.</li>
        <li><strong>Sentry:</strong> seguimiento de errores técnicos (sin datos personales del usuario).</li>
      </ul>

      <h2>Retención de datos</h2>
      <p>
        Los datos de pedidos se conservan por el tiempo necesario para cumplir con obligaciones fiscales (mínimo 5 años según
        legislación mexicana) o hasta que solicite su eliminación.
      </p>

      <h2>Sus derechos (ARCO)</h2>
      <p>
        Como titular de datos personales, usted puede ejercer sus derechos de <strong>Acceso, Rectificación, Cancelación y
        Oposición</strong> enviando un correo electrónico con su solicitud. Responderemos en un plazo máximo de 20 días hábiles.
      </p>

      <h2>Cambios a este aviso</h2>
      <p>
        Podemos actualizar este aviso periódicamente. La fecha de última actualización aparece al inicio del documento.
        El uso continuado de la aplicación implica la aceptación de los cambios.
      </p>
    </div>
  )
}
