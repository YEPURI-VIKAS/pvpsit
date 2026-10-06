package com.pvpsit.facility.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DataSourceConfig {

    @Value("${SPRING_DATASOURCE_URL:${DATABASE_URL:jdbc:h2:mem:facilitydb;DB_CLOSE_DELAY=-1}}")
    private String rawUrl;

    @Value("${SPRING_DATASOURCE_USERNAME:${DATABASE_USERNAME:sa}}")
    private String username;

    @Value("${SPRING_DATASOURCE_PASSWORD:${DATABASE_PASSWORD:password}}")
    private String password;

    @Value("${SPRING_DATASOURCE_DRIVER_CLASS_NAME:}")
    private String driverClassName;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        String jdbcUrl = rawUrl.trim();

        // Fix malformed URLs:
        // Case 1: //host:port/db (missing protocol)
        if (jdbcUrl.startsWith("//")) {
            jdbcUrl = "jdbc:postgresql:" + jdbcUrl;
        }
        // Case 2: postgres://user:pass@host:port/db or postgresql://user:pass@host:port/db
        else if (jdbcUrl.startsWith("postgres://") || jdbcUrl.startsWith("postgresql://")) {
            try {
                URI uri = new URI(jdbcUrl);
                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    username = parts[0];
                    password = parts[1];
                }
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = uri.getPath();
                if (path != null && path.startsWith("/")) {
                    path = path.substring(1);
                }
                jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s", uri.getHost(), port, path);
            } catch (Exception e) {
                // If URI parsing fails, prepend jdbc:
                if (!jdbcUrl.startsWith("jdbc:")) {
                    jdbcUrl = "jdbc:" + jdbcUrl;
                }
            }
        }
        // Case 3: Bare host:port/db
        else if (!jdbcUrl.startsWith("jdbc:")) {
            jdbcUrl = "jdbc:postgresql://" + jdbcUrl;
        }

        config.setJdbcUrl(jdbcUrl);

        // Determine driver based on URL
        if (jdbcUrl.contains(":h2:")) {
            config.setDriverClassName("org.h2.Driver");
            config.setUsername(username.isEmpty() ? "sa" : username);
            config.setPassword(password.isEmpty() ? "password" : password);
        } else if (jdbcUrl.contains(":postgresql:")) {
            config.setDriverClassName("org.postgresql.Driver");
            config.setUsername(username);
            config.setPassword(password);
        } else if (!driverClassName.isEmpty()) {
            config.setDriverClassName(driverClassName);
            config.setUsername(username);
            config.setPassword(password);
        }

        // Connection pool settings for Render / Cloud stability
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setIdleTimeout(30000);
        config.setConnectionTimeout(30000);

        return new HikariDataSource(config);
    }
}
