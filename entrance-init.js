/* Marca <html> antes do primeiro paint para a animação de entrada premium
   (ver ".entrance" em styles.css). Carregado de forma síncrona e cedo no
   <head> para não haver flash de conteúdo visível antes de ocultá-lo.
   Se este arquivo não carregar por qualquer motivo, a classe nunca é
   adicionada e todo o conteúdo ".entrance" permanece visível (opacity:1),
   o site continua 100% utilizável. */
document.documentElement.classList.add('has-js-anim');
