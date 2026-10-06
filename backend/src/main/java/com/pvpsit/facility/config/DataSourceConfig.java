package com.pvpsit.facility.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;
import java.sql.Connection;

@Configuration
public class DataSourceConfig {

    private static final Logger logger = LoggerFactory.getLogger(DataSourceConfig.class);

    @Value("${SPRING_DATASOURCE_URL:${DATABASE_URL:jdbc:h2:mem:facilitydb;DB_CLOSE_DELAY=-1}}")
    private String rawUrl;

    @Value("${SPRING_DATASOURCE_USERNAME:${DATABASE_USERNAME:sa}}")
    private String username;

    @Value("${SPRING_DATASOURCE_PASSWORD:${DATABASE_PASSWORD:password}}")
    private String password;

    @Value("${SPRING_DATASOURCE_DRIVER_CLASS_NAME:}")
    private String driverClassName;

    private DataSource createH2DataSource() {
        logger.info("Initializing in-memory H2 database (facilitydb)...");
        HikariConfig h2Config = new HikariConfig();
        h2Config.setJdbcUrl("jdbc:h2:mem:facilitydb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL");
        h2Config.setDriverClassName("org.h2.Driver");
        h2Config.setUsername("sa");
        h2Config.setPassword("password");
        h2Config.setMaximumPoolSize(10);
        return new HikariDataSource(h2Config);
    }

    @Bean
    @Primary
    public DataSource dataSource() {
        String jdbcUrl = rawUrl.trim();

        // If explicitly set to H2 or empty, use H2 directly
        if (jdbcUrl.isEmpty() || jdbcUrl.contains(":h2:")) {
            return createH2DataSource();
        }

        // Format Postgres URL
        if (jdbcUrl.startsWith("//")) {
            jdbcUrl = "jdbc:postgresql:" + jdbcUrl;
        } else if (jdbcUrl.startsWith("postgres://") || jdbcUrl.startsWith("postgresql://")) {
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
                if (!jdbcUrl.startsWith("jdbc:")) {
                    jdbcUrl = "jdbc:" + jdbcUrl;
                }
            }
        } else if (!jdbcUrl.startsWith("jdbc:")) {
            jdbcUrl = "jdbc:postgresql://" + jdbcUrl;
        }

        try {
            logger.info("Attempting database connection to: {}", jdbcUrl);
            HikariConfig config = new HikariConfig();
            config.setJdbcUrl(jdbcUrl);
            config.setDriverClassName("org.postgresql.Driver");
            config.setUsername(username);
            config.setPassword(password);
            config.setMaximumPoolSize(10);
            config.setMinimumIdle(2);
            config.setConnectionTimeout(5000); // 5 sec timeout
            config.setValidationTimeout(3000);

            HikariDataSource ds = new HikariDataSource(config);
            // Test connection immediately
            try (Connection conn = ds.getConnection()) {
                logger.info("Successfully connected to external PostgreSQL database!");
            }
            return ds;
        } catch (Exception ex) {
            logger.warn("Could not connect to external PostgreSQL database ({}). Falling back to built-in H2 in-memory database.", ex.getMessage());
            return createH2DataSource();
        }
    }
}
