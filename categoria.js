import { supabase } from "./supabase-config.js";

// 1. Averiguamos de qué categoría se trata, y si estamos DENTRO de una
//    sección específica, mirando la URL.
//    Ejemplos:
//      categoria.html?cat=tv-cine                 -> categoría entera
//      categoria.html?cat=tv-cine&seccion=abc-123 -> una sección puntual
const parametros = new URLSearchParams(window.location.search);
const catId = parametros.get("cat");
const seccionId = parametros.get("seccion");

const tituloEl = document.getElementById("titulo-categoria");
const linkVolverEl = document.getElementById("link-volver");
const bloqueSeccionesEl = document.getElementById("bloque-secciones");
const contenedorSeccionesEl = document.getElementById("contenedor-secciones");

const listaEl = document.getElementById("lista-items");
const formEl = document.getElementById("form-agregar");
const botonMostrarForm = document.getElementById("boton-mostrar-form");

const botonMostrarFormSeccion = document.getElementById("boton-mostrar-form-seccion");
const formNuevaSeccion = document.getElementById("form-nueva-seccion");

// El nombre del "bucket" (carpeta) de Storage donde van las imágenes
const BUCKET_IMAGENES = "imagenes";

// "categorias" ya no es un archivo fijo: ahora vive en Supabase,
// así que la buscamos con una consulta.
async function obtenerNombreCategoria() {
  const { data, error } = await supabase
    .from("categorias")
    .select("nombre")
    .eq("id", catId)
    .single();

  return error || !data ? null : data.nombre;
}

// 2. Decidimos qué mostrar: ¿la categoría completa (con sus secciones),
//    o el contenido de una sección puntual?
async function inicializar() {
  const nombreCategoria = await obtenerNombreCategoria();

  if (seccionId) {
    // Estamos DENTRO de una sección: escondemos el bloque de secciones
    // y ajustamos el título y el link de "Volver"
    bloqueSeccionesEl.classList.add("oculto");
    linkVolverEl.href = `categoria.html?cat=${catId}`;
    linkVolverEl.textContent = `← Volver a ${nombreCategoria || "la categoría"}`;
    cargarNombreSeccion();
  } else {
    // Estamos viendo la categoría entera
    tituloEl.textContent = nombreCategoria || "Categoría no encontrada";
    linkVolverEl.href = "index.html";
    linkVolverEl.textContent = "← Volver";
    cargarSecciones();
  }
}

inicializar();

// 3. Si estamos en una sección, traemos su nombre para mostrarlo como título
async function cargarNombreSeccion() {
  const { data, error } = await supabase
    .from("secciones")
    .select("nombre")
    .eq("id", seccionId)
    .single();

  tituloEl.textContent = error || !data ? "Sección no encontrada" : data.nombre;
}

// 4. Traer y dibujar los botones de las secciones de esta categoría
async function cargarSecciones() {
  const { data: secciones, error } = await supabase
    .from("secciones")
    .select("*")
    .eq("categoria", catId)
    .order("created_at", { ascending: true });

  contenedorSeccionesEl.innerHTML = "";

  if (error) {
    console.error(error);
    return;
  }

  secciones.forEach((seccion) => {
    const boton = document.createElement("a");
    boton.href = `categoria.html?cat=${catId}&seccion=${seccion.id}`;
    boton.className = "boton-categoria";
    boton.textContent = seccion.nombre;
    contenedorSeccionesEl.appendChild(boton);
  });
}

// 5. Mostrar/ocultar el mini formulario para crear una sección nueva
//    (este bloque de botones solo existe cuando bloque-secciones está visible,
//    pero el código no molesta aunque esté oculto)
botonMostrarFormSeccion.addEventListener("click", () => {
  const estaOculto = formNuevaSeccion.classList.toggle("oculto");
  botonMostrarFormSeccion.textContent = estaOculto
    ? "+ Nueva sección"
    : "✕ Cerrar";
});

formNuevaSeccion.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nombre = document.getElementById("input-nombre-seccion").value;

  const { error } = await supabase
    .from("secciones")
    .insert({ categoria: catId, nombre: nombre });

  if (error) {
    alert("Error al crear la sección: " + error.message);
    return;
  }

  formNuevaSeccion.reset();
  formNuevaSeccion.classList.add("oculto");
  botonMostrarFormSeccion.textContent = "+ Nueva sección";
  cargarSecciones();
});

// 6. Mostrar/ocultar el formulario para agregar un item
botonMostrarForm.addEventListener("click", () => {
  const estaOculto = formEl.classList.toggle("oculto");
  botonMostrarForm.textContent = estaOculto
    ? "+ Agregar algo nuevo"
    : "✕ Cerrar";
});

// 7. Traer y mostrar los items:
//    - Si estamos en una sección, solo los de esa sección.
//    - Si estamos en la categoría entera, solo los "generales"
//      (los que NO pertenecen a ninguna sección).
async function cargarItems() {
  listaEl.innerHTML = "<p class='mensaje-vacio'>Cargando...</p>";

  let consulta = supabase
    .from("items")
    .select("*")
    .eq("categoria", catId)
    // Ordenamos por la columna "orden". Los items que todavía no tienen
    // un orden asignado (los recién creados) van al final de la lista.
    .order("orden", { ascending: true, nullsFirst: false });

  consulta = seccionId
    ? consulta.eq("seccion_id", seccionId)
    : consulta.is("seccion_id", null);

  const { data: items, error } = await consulta;

  if (error) {
    listaEl.innerHTML = `<p class="mensaje-vacio">Ocurrió un error al cargar: ${error.message}</p>`;
    console.error(error);
    return;
  }

  if (!items || items.length === 0) {
    listaEl.innerHTML =
      "<p class='mensaje-vacio'>Todavía no agregaste nada acá.</p>";
    return;
  }

  listaEl.innerHTML = "";

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    div.draggable = true; // esto habilita el "arrastrar" del navegador
    div.dataset.id = item.id; // guardamos el id acá para usarlo al reordenar

    div.innerHTML = `
      ${item.imagen_url ? `<img src="${item.imagen_url}" alt="">` : ""}
      <div class="item-contenido">
        <p>${item.texto}</p>
        ${item.enlace ? `<a href="${item.enlace}" target="_blank" rel="noopener">Ver enlace</a>` : ""}
      </div>
      <button class="item-eliminar" data-id="${item.id}" data-imagen="${item.imagen_path || ""}">
        Eliminar
      </button>
    `;

    listaEl.appendChild(div);
  });

  document.querySelectorAll(".item-eliminar").forEach((boton) => {
    boton.addEventListener("click", eliminarItem);
  });

  activarArrastrarYSoltar();
}

// 7.1. Hace que cada tarjeta recién dibujada sea arrastrable
function activarArrastrarYSoltar() {
  const tarjetas = listaEl.querySelectorAll(".item");

  tarjetas.forEach((tarjeta) => {
    // Cuando empieza a arrastrarse, le agregamos una clase para
    // poder identificarla y darle un estilo (semi-transparente)
    tarjeta.addEventListener("dragstart", () => {
      tarjeta.classList.add("arrastrando");
    });

    // Cuando se suelta, sacamos esa clase y guardamos el orden nuevo
    tarjeta.addEventListener("dragend", () => {
      tarjeta.classList.remove("arrastrando");
      guardarNuevoOrden();
    });
  });
}

// 7.2. Mientras arrastramos una tarjeta sobre la lista, vamos moviéndola
//      en tiempo real. Este listener se agrega UNA sola vez porque el
//      contenedor de la lista (listaEl) nunca se destruye, aunque las
//      tarjetas de adentro se vuelvan a dibujar todo el tiempo.
listaEl.addEventListener("dragover", (evento) => {
  evento.preventDefault(); // sin esto, el navegador no deja "soltar" acá

  const elementoArrastrando = listaEl.querySelector(".arrastrando");
  if (!elementoArrastrando) return;

  const elementoDespues = obtenerElementoDespuesDelMouse(evento.clientY);

  if (elementoDespues == null) {
    // El mouse está más abajo que todas las tarjetas: va al final
    listaEl.appendChild(elementoArrastrando);
  } else {
    // La insertamos justo antes de la tarjeta que le sigue
    listaEl.insertBefore(elementoArrastrando, elementoDespues);
  }
});

// Calcula, según la posición vertical (Y) del mouse, delante de qué
// tarjeta debería quedar la que estamos arrastrando
function obtenerElementoDespuesDelMouse(y) {
  const tarjetas = [...listaEl.querySelectorAll(".item:not(.arrastrando)")];

  return tarjetas.reduce(
    (masCercana, tarjeta) => {
      const caja = tarjeta.getBoundingClientRect();
      // Distancia entre el mouse y el CENTRO vertical de esta tarjeta
      const distancia = y - caja.top - caja.height / 2;

      // Nos quedamos con la tarjeta más cercana que esté "debajo" del mouse
      if (distancia < 0 && distancia > masCercana.distancia) {
        return { distancia: distancia, elemento: tarjeta };
      } else {
        return masCercana;
      }
    },
    { distancia: Number.NEGATIVE_INFINITY, elemento: null }
  ).elemento;
}

// 7.3. Después de soltar, leemos el orden actual de las tarjetas en
//      pantalla y lo guardamos en Supabase (posición 0, 1, 2...)
async function guardarNuevoOrden() {
  const tarjetas = [...listaEl.querySelectorAll(".item")];

  const actualizaciones = tarjetas.map((tarjeta, indice) =>
    supabase.from("items").update({ orden: indice }).eq("id", tarjeta.dataset.id)
  );

  // Promise.all espera a que TODAS las actualizaciones terminen,
  // en vez de mandarlas una por una esperando cada respuesta
  await Promise.all(actualizaciones);
}

// 8. Agregar un item nuevo
async function agregarItem(evento) {
  evento.preventDefault();

  const texto = document.getElementById("input-texto").value;
  const enlace = document.getElementById("input-enlace").value;
  const archivoImagen = document.getElementById("input-imagen").files[0];

  let imagenURL = null;
  let imagenPath = null;

  if (archivoImagen) {
    imagenPath = `${catId}/${Date.now()}_${archivoImagen.name}`;

    const { error: errorSubida } = await supabase.storage
      .from(BUCKET_IMAGENES)
      .upload(imagenPath, archivoImagen);

    if (errorSubida) {
      alert("Error al subir la imagen: " + errorSubida.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_IMAGENES)
      .getPublicUrl(imagenPath);

    imagenURL = urlData.publicUrl;
  }

  const { error: errorInsertar } = await supabase.from("items").insert({
    categoria: catId,
    seccion_id: seccionId || null,
    texto: texto,
    enlace: enlace || null,
    imagen_url: imagenURL,
    imagen_path: imagenPath,
  });

  if (errorInsertar) {
    alert("Error al guardar: " + errorInsertar.message);
    return;
  }

  formEl.reset();
  formEl.classList.add("oculto");
  botonMostrarForm.textContent = "+ Agregar algo nuevo";
  cargarItems();
}

// 9. Eliminar un item
async function eliminarItem(evento) {
  const id = evento.target.dataset.id;
  const imagenPath = evento.target.dataset.imagen;

  await supabase.from("items").delete().eq("id", id);

  if (imagenPath) {
    await supabase.storage.from(BUCKET_IMAGENES).remove([imagenPath]);
  }

  cargarItems();
}

formEl.addEventListener("submit", agregarItem);
cargarItems(); // cargamos la lista de items apenas se abre la página
