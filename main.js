import { supabase } from "./supabase-config.js";

const contenedor = document.getElementById("contenedor-categorias");
const botonMostrarForm = document.getElementById("boton-mostrar-form-categoria");
const formNuevaCategoria = document.getElementById("form-nueva-categoria");

// 1. Traer y dibujar los botones de categorías
async function cargarCategorias() {
  const { data: categorias, error } = await supabase
    .from("categorias")
    .select("*")
    .order("created_at", { ascending: true });

  contenedor.innerHTML = "";

  if (error) {
    console.error(error);
    return;
  }

  categorias.forEach((categoria) => {
    const boton = document.createElement("a");
    boton.href = `categoria.html?cat=${categoria.id}`;
    boton.className = "boton-categoria";
    boton.textContent = categoria.nombre;
    contenedor.appendChild(boton);
  });
}

// 2. Mostrar/ocultar el mini formulario para crear una categoría nueva
botonMostrarForm.addEventListener("click", () => {
  const estaOculto = formNuevaCategoria.classList.toggle("oculto");
  botonMostrarForm.textContent = estaOculto
    ? "+ Agregar categoría"
    : "✕ Cerrar";
});

// 3. Crear la categoría nueva
formNuevaCategoria.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nombre = document.getElementById("input-nombre-categoria").value;

  // Generamos un "id" simple a partir del nombre (para usar en la URL):
  // todo en minúsculas, sin tildes, y los espacios/símbolos raros
  // reemplazados por guiones. Ej: "Series Anime" -> "series-anime"
  const id = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca los acentos
    .replace(/[^a-z0-9]+/g, "-") // reemplaza espacios/símbolos por "-"
    .replace(/(^-|-$)/g, ""); // saca guiones sobrantes al principio/final

  const { error } = await supabase
    .from("categorias")
    .insert({ id: id, nombre: nombre.toUpperCase() });

  if (error) {
    alert("Error al crear la categoría: " + error.message);
    return;
  }

  formNuevaCategoria.reset();
  formNuevaCategoria.classList.add("oculto");
  botonMostrarForm.textContent = "+ Agregar categoría";
  cargarCategorias();
});

cargarCategorias();
