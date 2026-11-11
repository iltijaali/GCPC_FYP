# The older plain-HTML frontend: static files served by nginx.
FROM nginx:1.27-alpine

COPY . /usr/share/nginx/html/

# api.js has the API address written in; point it at the address the browser should use
ARG API_URL=http://localhost:8000
RUN sed -i "s|http://localhost:8000|${API_URL}|g" /usr/share/nginx/html/api.js \
    && rm -f /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/.dockerignore

EXPOSE 80
