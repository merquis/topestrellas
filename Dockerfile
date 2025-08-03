FROM nginx:stable-alpine

# Copiar archivos del sitio web
COPY ./ /usr/share/nginx/html

# Copiar configuración nginx personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8081

CMD ["nginx", "-g", "daemon off;"]
